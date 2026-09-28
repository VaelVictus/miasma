from __future__ import annotations

import argparse
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

root_dir = Path(__file__).resolve().parent
base_url = "https://raw.githubusercontent.com/bonfiredog/blackcrownproject/master/assets/objects/object_data"
user_agent = "blackcrown-object-reconstruction/2.0"


def get_object_dirs() -> list[str]:
    manifest_text = (root_dir / "manifest.js").read_text(encoding="utf-8")
    return re.findall(r'dir:\s*"([^"]+)"', manifest_text)


def download_bytes(url: str, attempts: int = 3) -> bytes:
    last_error = None
    for attempt in range(attempts):
        try:
            request = Request(url, headers={"User-Agent": user_agent})
            with urlopen(request, timeout=45) as response:
                return response.read()
        except (HTTPError, URLError, TimeoutError) as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(0.7 * (attempt + 1))
    raise last_error


def download_text(url: str, required: bool = True) -> str:
    try:
        return download_bytes(url).decode("utf-8")
    except HTTPError as error:
        if error.code == 404 and not required:
            return ""
        raise


def archive_object(object_name: str) -> tuple[dict, str]:
    archive_dir = root_dir / "archive" / object_name
    archive_dir.mkdir(parents=True, exist_ok=True)

    data_url = f"{base_url}/{quote(object_name)}/data.json"
    info_url = f"{base_url}/{quote(object_name)}/info.html"

    data_text = download_text(data_url)
    info_text = download_text(info_url, required=False)

    (archive_dir / "data.json").write_text(data_text, encoding="utf-8")
    (archive_dir / "info.html").write_text(info_text, encoding="utf-8")

    return json.loads(data_text), info_text


def collect_asset_names(data: dict) -> tuple[set[str], set[str]]:
    images: set[str] = set()
    audio: set[str] = set()

    def walk(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key == "image" and isinstance(child, str):
                    if not child.lower().startswith("icon-"):
                        images.add(child)
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)
        elif isinstance(value, str):
            for match in re.finditer(r"playSound\(\s*['\"]([^'\"]+)['\"]", value):
                audio.add(match.group(1))

    walk(data)
    return images, audio


def asset_url(object_name: str, kind: str, filename: str) -> str:
    return f"{base_url}/{quote(object_name)}/{kind}/{quote(filename)}"


def download_asset(object_name: str, kind: str, filename: str) -> tuple[str, bool, str]:
    target_dir = root_dir / "assets" / object_name / kind
    target_dir.mkdir(parents=True, exist_ok=True)
    destination = target_dir / filename
    label = f"{object_name}/{kind}/{filename}"

    if destination.exists() and destination.stat().st_size > 0:
        return label, True, "exists"

    try:
        destination.write_bytes(download_bytes(asset_url(object_name, kind, filename)))
        return label, True, "downloaded"
    except Exception as error:
        return label, False, str(error)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download every image/audio asset referenced by the archived Black Crown object definitions."
    )
    parser.add_argument(
        "--object",
        dest="objects",
        action="append",
        help="Download only this object directory. May be supplied more than once.",
    )
    parser.add_argument("--workers", type=int, default=8, help="Concurrent asset downloads (default: 8).")
    args = parser.parse_args()

    all_objects = get_object_dirs()
    selected_objects = args.objects or all_objects
    unknown_objects = sorted(set(selected_objects) - set(all_objects))
    if unknown_objects:
        raise SystemExit(f"Unknown object(s): {', '.join(unknown_objects)}")

    queue: list[tuple[str, str, str]] = []
    failures: list[tuple[str, str]] = []
    totals = {"objects": 0, "images": 0, "audio": 0}

    for object_name in selected_objects:
        print(f"archive  {object_name}")
        try:
            data, _ = archive_object(object_name)
        except Exception as error:
            failures.append((f"{object_name}/data.json", str(error)))
            print(f"failed   {object_name}: {error}")
            continue

        images, audio = collect_asset_names(data)
        totals["objects"] += 1
        totals["images"] += len(images)
        totals["audio"] += len(audio)

        queue.extend((object_name, "images", filename) for filename in sorted(images))
        queue.extend((object_name, "audio", filename) for filename in sorted(audio))
        print(f"         {len(images)} image(s), {len(audio)} audio file(s)")

    workers = max(1, min(args.workers, 24))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(download_asset, *job) for job in queue]
        for future in as_completed(futures):
            label, ok, result = future.result()
            if ok:
                print(f"{result:10} {label}")
            else:
                failures.append((label, result))
                print(f"failed     {label}: {result}")

    print(
        f"\nArchived {totals['objects']} object definition(s); "
        f"requested {totals['images']} image(s) and {totals['audio']} audio file(s)."
    )

    if failures:
        print("\nSome files failed:")
        for label, error in failures:
            print(f"- {label}: {error}")
        raise SystemExit(1)

    print("All referenced object media is available locally. The viewer can now run offline.")


if __name__ == "__main__":
    main()
