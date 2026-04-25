import torch
import os
from artist import DQNAgent, AdvancedMolEnv

def export_to_onnx():
    # 1. Initialize the Environment to get correct dimensions
    # We use "C" as a placeholder
    env = AdvancedMolEnv(start_smiles="C")
    
    # 2. Initialize the Agent
    state_dim = 1024
    action_dim = env.action_dim
    agent = DQNAgent(state_dim=state_dim, action_dim=action_dim)
    
    # 3. Load the pre-trained weights
    model_path = "weights/drug_brain.pth"
    if not os.path.exists(model_path):
        print(f" Error: {model_path} not found. Please train the model first.")
        return

    # Load weights into the model inside the agent
    agent.model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    
    # Extract the raw PyTorch Neural Network (nn.Module)
    model = agent.model
    model.eval() # Set to evaluation mode (crucial for ONNX)

    # 4. Prepare dummy input
    # Morgan Fingerprints are 1024-bit vectors
    dummy_input = torch.randn(1, state_dim) 

    # 5. Export to ONNX
    onnx_file = "drug_brain.onnx"
    
    torch.onnx.export(
        model,               # The neural network
        dummy_input,         # Example input
        onnx_file,           # Output filename
        export_params=True,  # Store the trained weights inside the file
        opset_version=12,    # Standard version for broad compatibility
        do_constant_folding=True, 
        input_names=['molecular_fingerprint'], 
        output_names=['action_q_values'],
        dynamic_axes={
            'molecular_fingerprint': {0: 'batch_size'}, 
            'action_q_values': {0: 'batch_size'}
        }
    )

    print(f" Success! Model exported to: {onnx_file}")
    print(f"Input nodes: 1024 (Fingerprint bits)")
    print(f"Output nodes: {action_dim} (Action probabilities)")

if __name__ == "__main__":
    export_to_onnx()