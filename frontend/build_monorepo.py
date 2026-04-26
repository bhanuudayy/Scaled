import os
import shutil

base_dir = "/Users/bhanuuday/Documents/Playground"
target_dir = os.path.join(base_dir, "Scaled-Ad-Analyzer")
frontend_src = os.path.join(base_dir, "frontend")
backend_src = os.path.join(base_dir, "ad_creative_backend")

# Create target dir
if not os.path.exists(target_dir):
    os.makedirs(target_dir)

# Copy frontend (excluding heavy folders)
def ignore_frontend(dir, files):
    return [f for f in files if f in ["node_modules", ".next", ".git"]]

print("Copying frontend...")
shutil.copytree(frontend_src, os.path.join(target_dir, "frontend"), ignore=ignore_frontend, dirs_exist_ok=True)

# Copy backend (excluding heavy folders and secrets)
def ignore_backend(dir, files):
    return [f for f in files if f in ["__pycache__", ".venv", "venv", ".env", ".git", "patch_backend.py", "download_backend.py"]]

print("Copying backend...")
shutil.copytree(backend_src, os.path.join(target_dir, "backend"), ignore=ignore_backend, dirs_exist_ok=True)

# Create a clean .env.example in backend
with open(os.path.join(target_dir, "backend", ".env.example"), "w") as f:
    f.write("GROQ_API_KEY=gsk_your_api_key_here\nGROQ_MODEL=llama-3.3-70b-versatile\n")

print("Monorepo structure created successfully!")
