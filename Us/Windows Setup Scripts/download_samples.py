import os
import json
import urllib.request

INDEX_URL = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/model-index.json"
BASE_URL = "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/"
DEST_DIR = r"E:\Gold_XRF_SITE\Sample 3D Models"

os.makedirs(DEST_DIR, exist_ok=True)

print("Fetching 3D model list from Khronos Group repository...")
try:
    req = urllib.request.Request(
        INDEX_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    with urllib.request.urlopen(req) as response:
        models = json.loads(response.read().decode())
    
    downloaded = 0
    # Skip huge scenes to save bandwidth and prevent slow downloads
    SKIP_LIST = {"sponza", "bistro", "flighthelmet", "scifihelmet", "buggy", "gearboxassy", "busterdrone"}
    
    for model in models:
        name = model["name"]
        variants = model.get("variants", {})
        if "glTF-Binary" in variants:
            glb_file = variants["glTF-Binary"]
            url = f"{BASE_URL}{name}/glTF-Binary/{glb_file}"
            dest_path = os.path.join(DEST_DIR, glb_file)
            
            if name.lower() in SKIP_LIST:
                continue
                
            # If already downloaded, count it and skip re-download
            if os.path.exists(dest_path):
                print(f"[EXISTS] {name} ({glb_file}) already downloaded.")
                downloaded += 1
                if downloaded >= 50:
                    break
                continue
                
            print(f"Downloading model {downloaded + 1}/50: {name}...")
            try:
                file_req = urllib.request.Request(
                    url, 
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(file_req) as web_file:
                    with open(dest_path, "wb") as local_file:
                        local_file.write(web_file.read())
                downloaded += 1
                if downloaded >= 50:
                    break
            except Exception as e:
                print(f"Skipping {name} (Error: {e})")
                
    print(f"\nDone! Successfully prepared {downloaded} 3D models in: {DEST_DIR}")
except Exception as e:
    print(f"Error fetching model list: {e}")
