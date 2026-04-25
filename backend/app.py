# -- Basic Streamlit Implementation --
import streamlit as st
import torch
import numpy as np
import os
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, Draw, rdMolDescriptors
import py3Dmol
import pandas as pd

# Import the classes from your training script (artist.py)
from artist import DQNAgent, AdvancedMolEnv 

# --- CONFIGURATION ---
st.set_page_config(page_title="ARTIST - AI Molecule Architect", layout="wide")

# --- 1. THE BRAIN LOADER (CACHED) ---
@st.cache_resource
def load_pretrained_model():
    """Load the neural network weights once and keep them in memory."""
    temp_env = AdvancedMolEnv(start_smiles="C")
    agent = DQNAgent(state_dim=1024, action_dim=temp_env.action_dim)
    
    model_path = "drug_brain.pth"
    if os.path.exists(model_path):
        agent.model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    
    agent.model.eval()
    return agent

# Initialize the AI
agent = load_pretrained_model()

# --- 2. SESSION STATE (MEMORY) ---
if 'current_smiles' not in st.session_state:
    st.session_state.current_smiles = "C"
if 'history' not in st.session_state:
    st.session_state.history = ["C"]

# --- 3. SIDEBAR: STARTING MOLECULE ---
with st.sidebar:
    st.header("🧬 Initialization")
    
    presets = {
        "Methane (Single Carbon)": "C",
        "Benzene (Ring)": "c1ccccc1",
        "Ethanol": "CCO",
        "Caffeine": "CN1C=NC2=C1C(=O)N(C(=O)N2C)C",
        "Custom SMILES": "CUSTOM"
    }
    
    choice = st.selectbox("Choose starting molecule:", list(presets.keys()))
    
    if choice == "Custom SMILES":
        custom_input = st.text_input("Paste SMILES here:", value="C")
        start_smiles = custom_input
    else:
        start_smiles = presets[choice]

    if st.button("🚀 Set/Reset Environment"):
        if Chem.MolFromSmiles(start_smiles):
            st.session_state.current_smiles = start_smiles
            st.session_state.history = [start_smiles]
            st.rerun()
        else:
            st.error("Invalid SMILES! Please check the structure.")

# Now we create the environment using the SMILES from session state
env = AdvancedMolEnv(start_smiles=st.session_state.current_smiles)

# --- 4. HELPER: 3D VISUALIZATION ---
def show_3d(smiles):
    try:
        mol = Chem.MolFromSmiles(smiles)
        mol = Chem.AddHs(mol)
        AllChem.EmbedMolecule(mol, AllChem.ETKDG())
        mblock = Chem.MolToMolBlock(mol)
        
        view = py3Dmol.view(width=400, height=400)
        view.addModel(mblock, 'mol')
        view.setStyle({'stick': {'colorscheme': 'cyanCarbon'}, 'sphere': {'scale': 0.3}})
        view.zoomTo()
        return view._make_html()
    except:
        return "<b>3D Error:</b> Structure too simple or invalid."

# --- 5. MAIN UI LAYOUT ---
st.title("🎨 ARTIST: AI Molecular Architect")
st.markdown("---")

col1, col2, col3 = st.columns([1.2, 2, 1])

with col1:
    st.subheader("🛠 Construction")
    
    # Get current state for AI
    mol = env.current_mol
    fp = env._get_state(mol)
    state_t = torch.FloatTensor(fp).unsqueeze(0)
    
    with torch.no_grad():
        q_values = agent.model(state_t).numpy()[0]
    
    actions = [name for _, name in env.action_library]
    best_idx = np.argmax(q_values)
    
    # UPDATED BRANDING
    st.info(f"🎨 **ARTIST Suggests:** {actions[best_idx]}")
    
    # Action interface
    selected_action = st.selectbox("Select fragment to attach:", actions)
    
    if st.button("➕ Add Fragment", use_container_width=True, type="primary"):
        action_idx = actions.index(selected_action)
        if selected_action == "Done":
            st.balloons()
            st.success("Molecule Finalized!")
        else:
            frag_smiles = env.action_library[action_idx][0]
            new_mol = env._add_fragment(mol, frag_smiles)
            if new_mol:
                st.session_state.current_smiles = Chem.MolToSmiles(new_mol)
                st.session_state.history.append(st.session_state.current_smiles)
                st.rerun()
            else:
                st.error("Chemical Bond Failed!")

    st.divider()
    st.subheader("📜 History")
    for i, s in enumerate(st.session_state.history):
        st.caption(f"Step {i}: `{s}`")

with col2:
    st.subheader("🧊 3D Visualization")
    html_3d = show_3d(st.session_state.current_smiles)
    st.components.v1.html(html_3d, height=450)
    
    # Decision Bar Chart
    st.subheader("🧠 Decision Logic")
    chart_data = pd.DataFrame({'Fragment': actions, 'Confidence': q_values})
    st.bar_chart(chart_data.set_index('Fragment'))

with col3:
    st.subheader("📊 Properties")
    curr_mol = Chem.MolFromSmiles(st.session_state.current_smiles)
    
    # Calculations
    qed = Descriptors.qed(curr_mol)
    logp = Descriptors.MolLogP(curr_mol)
    mw = Descriptors.MolWt(curr_mol)
    n_rings = rdMolDescriptors.CalcNumRings(curr_mol)
    # SAS calculation matching your training logic
    sas = (np.log10(mw) + n_rings) * 1.5
    
    # Display Metrics
    st.metric("Drug-likeness (QED)", f"{qed:.3f}")
    st.metric("Complexity (SAS)", f"{sas:.2f}") # ADDED SAS
    st.metric("Weight (MW)", f"{mw:.1f}")
    st.metric("Lipophilicity (LogP)", f"{logp:.2f}")
    
    st.progress(qed, text="Drug-likeness Progress")
    
    # Rules Check
    st.markdown("### Compliance")
    if mw > 500: st.error("❌ MW > 500 (Heavy)")
    else: st.success("✅ Weight OK")
    
    if logp > 5: st.error("❌ LogP > 5 (Greasy)")
    else: st.success("✅ LogP OK")
    
    if sas > 4.2: st.warning("⚠️ High Complexity")
    else: st.success("✅ Synthesis OK")
    
    st.divider()
    # Download Button
    st.download_button("💾 Export SMILES", st.session_state.current_smiles, file_name="molecule.txt")