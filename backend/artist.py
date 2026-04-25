import numpy as np
import random
import torch
import torch.nn as nn
import torch.optim as optim
import os
import matplotlib.pyplot as plt
from collections import deque
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, Draw, rdMolDescriptors

# --- 1. THE MOLECULAR ENVIRONMENT ---
class AdvancedMolEnv:
    def __init__(self, start_smiles):
        self.start_smiles = start_smiles
        self.action_library = [
            ("C", "Methyl"), ("c1ccccc1", "Phenyl"), ("C(=O)O", "Carboxyl"),
            ("N", "Amino"), ("O", "Hydroxyl"), ("C(C)C", "Isopropyl"),
            ("Cl", "Chloride"), ("TERMINATE", "Done")
        ]
        self.action_dim = len(self.action_library)
        self.reset()

    def reset(self):
        self.current_mol = Chem.MolFromSmiles(self.start_smiles)
        self.steps = 0
        return self._get_state(self.current_mol)

    def _get_state(self, mol):
        fp = AllChem.GetMorganFingerprintAsBitVect(mol, 2, nBits=1024)
        return np.array(fp, dtype=np.float32)

    def _calculate_reward(self, mol, finished=False):
        if mol is None: return -5.0
        try:
            qed = Descriptors.qed(mol)
            mw = Descriptors.MolWt(mol)
            n_rings = rdMolDescriptors.CalcNumRings(mol)
            sas = (np.log10(mw) + n_rings) * 1.5 # complexity metric
            
            if finished:
                logp = Descriptors.MolLogP(mol)
                # PARETO REWARD: Balance QED against SAS
                # We subtract SAS to prevent "Reward Hacking"
                reward = (qed * 25.00) - (sas * 2.00)
                
                # Rule of 5 Penalties
                if mw > 500: reward -= 15.0
                if logp > 5: reward -= 5.0
                
                # Penalize "scary" complexity
                if sas > 4.2: reward -= 10.0 
                
                return reward
            else:
                # guided exploration
                return qed * 0.5
        except:
            return -5.0

    def step(self, action_idx):
        self.steps += 1
        frag_smiles, name = self.action_library[action_idx]
        if name == "Done" or self.steps >= 10:
            return self._get_state(self.current_mol), self._calculate_reward(self.current_mol, finished=True), True
        new_mol = self._add_fragment(self.current_mol, frag_smiles)
        if new_mol is not None:
            self.current_mol = new_mol
            reward = self._calculate_reward(self.current_mol, finished=False)
            done = False
        else:
            reward = -2.0 
            done = True
        return self._get_state(self.current_mol), reward, done

    def _add_fragment(self, mol, frag_smiles):
        try:
            fragment = Chem.MolFromSmiles(frag_smiles)
            combined = Chem.CombineMols(mol, fragment)
            res = Chem.RWMol(combined)
            res.AddBond(mol.GetNumAtoms() - 1, mol.GetNumAtoms(), Chem.rdchem.BondType.SINGLE)
            new_mol = res.GetMol()
            Chem.SanitizeMol(new_mol)
            return new_mol
        except:
            return None

# --- 2 DQN with Q-Tracking ---
class QNetwork(nn.Module):
    def __init__(self, input_dim, output_dim):
        super(QNetwork, self).__init__()
        self.fc = nn.Sequential(
            nn.Linear(input_dim, 512), nn.ReLU(),
            nn.Linear(512, 256), nn.ReLU(),
            nn.Linear(256, output_dim)
        )
    def forward(self, x): return self.fc(x)

class DQNAgent:
    def __init__(self, state_dim, action_dim):
        self.state_dim, self.action_dim = state_dim, action_dim
        self.memory = deque(maxlen=30000)
        self.gamma, self.epsilon = 0.99, 1.0
        self.epsilon_decay, self.epsilon_min = 0.998, 0.02
        self.model = QNetwork(state_dim, action_dim)
        self.target_model = QNetwork(state_dim, action_dim)
        self.update_target()
        self.optimizer = optim.Adam(self.model.parameters(), lr=0.0002)
        self.last_q_val = 0 # Tracker for Q-Value

    def update_target(self):
        self.target_model.load_state_dict(self.model.state_dict())

    def act(self, state, eval_mode=False):
        if not eval_mode and np.random.rand() <= self.epsilon:
            return random.randrange(self.action_dim)
        state_t = torch.FloatTensor(state).unsqueeze(0)
        with torch.no_grad():
            q_values = self.model(state_t)
            self.last_q_val = torch.max(q_values).item()
            return torch.argmax(q_values).item()

    def train(self, batch_size=64):
        if len(self.memory) < 1000: return 0
        batch = random.sample(self.memory, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)
        states = torch.FloatTensor(np.array(states))
        actions = torch.LongTensor(actions).unsqueeze(1)
        rewards = torch.FloatTensor(rewards)
        next_states = torch.FloatTensor(np.array(next_states))
        dones = torch.FloatTensor(dones)
        
        current_q = self.model(states).gather(1, actions).squeeze()
        with torch.no_grad():
            next_q = self.target_model(next_states).max(1)[0]
            target_q = rewards + (self.gamma * next_q * (1 - dones))
        
        loss = nn.MSELoss()(current_q, target_q)
        self.optimizer.zero_grad(); loss.backward(); self.optimizer.step()
        if self.epsilon > self.epsilon_min: self.epsilon *= self.epsilon_decay
        return torch.mean(current_q).item()

# --- 3. COMPARISON ---
def evaluate(env, agent, n_episodes=50):
    print("\n" + "="*50 + "\n FINAL BENCHMARK\n" + "="*50)
    def run_eval(is_random):
        res = {'qed': [], 'sas': [], 'valid': 0, 'reward': []}
        for _ in range(n_episodes):
            state = env.reset(); done, ep_rew = False, 0
            while not done:
                action = random.randrange(env.action_dim) if is_random else agent.act(state, eval_mode=True)
                state, reward, done = env.step(action); ep_rew += reward
            if env.current_mol:
                res['valid'] += 1; res['qed'].append(Descriptors.qed(env.current_mol))
                mw = Descriptors.MolWt(env.current_mol)
                res['sas'].append((np.log10(mw) + rdMolDescriptors.CalcNumRings(env.current_mol)) * 1.5)
                res['reward'].append(ep_rew)
        return res
    r_res, rl_res = run_eval(True), run_eval(False)
    metrics = [
        ('Avg QED', np.mean(r_res['qed']), np.mean(rl_res['qed']), 1),
        ('Validity Rate (%)', (r_res['valid']/n_episodes)*100, (rl_res['valid']/n_episodes)*100, 1),
        ('Avg SAS', np.mean(r_res['sas']), np.mean(rl_res['sas']), -1),
        ('Avg Final Reward Score', np.mean(r_res['reward']), np.mean(rl_res['reward']), 1)
    ]
    print(f"{'Metric':<25} | {'Random':<10} | {'RL Agent':<10} | {'Improvement'}")
    print("-" * 65)
    for name, r, rl, direction in metrics:
        imp = ((rl - r) / abs(r)) * 100 * direction
        print(f"{name:<25} | {r:<10.3f} | {rl:<10.3f} | {imp:>8.2f}%")
if __name__ == "__main__":
    # 1. Setup
    if not os.path.exists("demo_outputs"): 
        os.makedirs("demo_outputs")
    
    env = AdvancedMolEnv(start_smiles="C") 
    agent = DQNAgent(state_dim=1024, action_dim=env.action_dim)
    
    episodes = 1200
    history = {'ep': [], 'rew': [], 'qed': [], 'sas': [], 'q_val': []}
    
    # 2. Establish Baseline
    print("Gathering Baseline...")
    base_rews, base_qeds, base_sas = [], [], []
    for _ in range(50):
        env.reset()
        done, ep_rew = False, 0
        while not done: 
            _, r, done = env.step(random.randrange(env.action_dim))
            ep_rew += r
        base_rews.append(ep_rew)
        base_qeds.append(Descriptors.qed(env.current_mol))
        base_sas.append((np.log10(Descriptors.MolWt(env.current_mol)) + rdMolDescriptors.CalcNumRings(env.current_mol)) * 1.5)

    # 3. Training Loop
    print("Training Pareto-Optimized Agent...")
    for e in range(episodes):
        state = env.reset()
        total_reward = 0
        for t in range(10):
            action = agent.act(state)
            next_state, reward, done = env.step(action)
            agent.memory.append((state, action, reward, next_state, done))
            state = next_state
            total_reward += reward
            if done: break
        
        avg_q_batch = agent.train()
        if e % 10 == 0:
            agent.update_target()
            history['ep'].append(e)
            history['rew'].append(total_reward)
            history['qed'].append(Descriptors.qed(env.current_mol))
            history['sas'].append((np.log10(Descriptors.MolWt(env.current_mol)) + rdMolDescriptors.CalcNumRings(env.current_mol)) * 1.5)
            history['q_val'].append(avg_q_batch)
        if e % 100 == 0: 
            print(f"Ep {e} | QED: {Descriptors.qed(env.current_mol):.2f} | Q-Val: {avg_q_batch:.2f}")

    # 4. Save the weights
    model_path = "drug_brain.pth"
    torch.save(agent.model.state_dict(), model_path)
    print(f"\n Weights saved to {model_path}")

    # 5. Visualization & Evaluation
    plt.figure(figsize=(20, 5))
    titles = ['Reward Convergence', 'QED Optimization', 'SAS Complexity', 'Average Q-Value']
    keys = ['rew', 'qed', 'sas', 'q_val']
    baselines = [np.mean(base_rews), np.mean(base_qeds), np.mean(base_sas), None]
    
    for i in range(4):
        plt.subplot(1, 4, i+1)
        plt.plot(history['ep'], history[keys[i]], color='blue' if i!=2 else 'purple', alpha=0.5)
        if baselines[i] is not None: 
            plt.axhline(y=baselines[i], color='red', linestyle='--')
        plt.title(titles[i])
        plt.xlabel('Episode')

    plt.tight_layout()
    plt.savefig('demo_outputs/final_pareto_curves.png')
    
    evaluate(env, agent)