# Memory Optimization

- Downsample oversized images to display size using Image I/O to avoid decoding huge bitmaps. citeturn15search8
- Cache decoded thumbnails with `NSCache`.
- Use Memory Graph and Leaks to verify fixes. citeturn7search1
- Scope temporary Foundation objects with `autoreleasepool {}` in long loops. citeturn14search5
