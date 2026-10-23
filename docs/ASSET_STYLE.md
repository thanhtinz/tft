# ASSET STYLE — Đấu Trường Chibi (raster splash art)

Toàn bộ nhân vật/cảnh dùng tranh raster AI-generated theo khối phong cách dưới đây (dùng nguyên văn trong mọi prompt sinh ảnh). Nhân vật là sáng tạo gốc theo mô tả riêng trong `src/game/data.ts`, không sao chép nhân vật của Riot hay game khác.

## Style block (dùng nguyên văn)
Premium mobile game splash art style: soft painterly shading, big glossy sparkling eyes with bright highlights, detailed costume with metallic gold trim, soft rim light, rich saturated colors, very high detail. Not flat vector, not a children's book illustration, no text, no watermark.

## Khung nhân vật (dùng nguyên văn, thay [SUBJECT])
Full-body chibi game character splash art of [SUBJECT]. Standing in a slight three-quarter pose facing the viewer, on a completely flat solid pure magenta background color #FF00FF, uniform with no gradient, no scenery, no ground shadow. The character fills about 85 percent of the frame height, centered. + [Style block]

## Khung cảnh (không tách nền)
Painterly fantasy game environment art, landscape orientation, [SUBJECT]. Soft painterly shading, rich saturated colors, soft rim light, very high detail, no characters, no text, no watermark.

## Pipeline
- Ảnh gốc PNG → `art-raw/` (không commit) → `scripts/process-art.mjs`: tách nền magenta → alpha (nhân vật), resize + nén WebP → `assets/art/**/*.webp` → encode `.webp.b64` để commit (file .webp bị gitignore).
- `scripts/decode-art.mjs` giải mã .b64 → .webp ở postinstall và trong Vercel buildCommand.
- `src/game/artManifest.ts` được sinh tự động bởi process-art: require tĩnh từng file .webp.
- Nhân vật hiển thị qua component `SpriteUnit` (animation cấp sprite: idle/walk/attack/cast/hurt/death/victory), thay cho rig SVG cũ ở mọi bề mặt nhân vật/cảnh.
