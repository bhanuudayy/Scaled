import os
import sys

possible_paths = [
    os.path.expanduser("~/Desktop/Scaled/ad_creative_backend"),
    os.path.expanduser("~/Desktop/ad_creative_backend"),
    os.path.expanduser("~/Documents/Playground/Scaled/ad_creative_backend"),
    os.path.expanduser("~/Documents/Playground/ad_creative_backend"),
    os.path.abspath(os.path.join(os.getcwd(), "../../ad_creative_backend")),
    os.path.abspath(os.path.join(os.getcwd(), "../ad_creative_backend")),
]

target_dir = None
for p in possible_paths:
    if os.path.exists(os.path.join(p, "app/main.py")):
        target_dir = p
        break

if not target_dir:
    print("Could not find the ad_creative_backend directory.")
    sys.exit(1)

print(f"Found backend at: {target_dir}")

# 1. Update settings.py
settings_path = os.path.join(target_dir, "app/utils/settings.py")
with open(settings_path, "r") as f:
    settings_code = f.read()

settings_code = settings_code.replace("openai_api_key", "deepseek_api_key")
settings_code = settings_code.replace("OPENAI_API_KEY", "DEEPSEEK_API_KEY")
settings_code = settings_code.replace("openai_model", "deepseek_model")
settings_code = settings_code.replace("OPENAI_MODEL", "DEEPSEEK_MODEL")
settings_code = settings_code.replace("gpt-4o-mini", "deepseek-chat")
settings_code = settings_code.replace("gpt-4.1-mini", "deepseek-chat")

with open(settings_path, "w") as f:
    f.write(settings_code)
print("Updated settings.py")

# 2. Update interpretation_service.py
interp_path = os.path.join(target_dir, "app/services/interpretation_service.py")
with open(interp_path, "r") as f:
    interp_code = f.read()

interp_code = interp_code.replace("settings.openai_api_key", "settings.deepseek_api_key")
interp_code = interp_code.replace("_interpret_with_openai", "_interpret_with_deepseek")
interp_code = interp_code.replace("settings.openai_model", "settings.deepseek_model")
interp_code = interp_code.replace("https://api.openai.com/v1/chat/completions", "https://api.deepseek.com/chat/completions")

with open(interp_path, "w") as f:
    f.write(interp_code)
print("Updated interpretation_service.py")

# 3. Update ai_auditor.py
auditor_path = os.path.join(target_dir, "app/services/ai_auditor.py")
with open(auditor_path, "r") as f:
    auditor_code = f.read()

auditor_code = auditor_code.replace("settings.openai_api_key", "settings.deepseek_api_key")
auditor_code = auditor_code.replace("https://api.openai.com/v1/chat/completions", "https://api.deepseek.com/chat/completions")

with open(auditor_path, "w") as f:
    f.write(auditor_code)
print("Updated ai_auditor.py")

# 4. Create .env
env_path = os.path.join(target_dir, ".env")
with open(env_path, "w") as f:
    f.write("DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here\nDEEPSEEK_MODEL=deepseek-chat\n")
print("Created .env")

print("SUCCESS!")
