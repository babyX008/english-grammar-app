import json, base64

manifest = {
    "name": "英语语法练习",
    "short_name": "语法练习",
    "start_url": "./",
    "display": "standalone",
    "background_color": "#0f0f0f",
    "theme_color": "#0f0f0f",
    "orientation": "portrait-primary",
    "icons": [{
        "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>📝</text></svg>",
        "sizes": "144x144",
        "type": "image/svg+xml"
    }]
}

json_str = json.dumps(manifest, ensure_ascii=False)
b64 = base64.b64encode(json_str.encode('utf-8')).decode('ascii')

# Save manifest.json
with open('manifest.json', 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

# Print base64 (redirect-safe)
import sys
sys.stdout.buffer.write(b64.encode('ascii'))
