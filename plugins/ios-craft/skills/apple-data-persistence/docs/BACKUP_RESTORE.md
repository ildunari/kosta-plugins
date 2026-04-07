# BACKUP_RESTORE.md
- Documents/: user-facing files; backed up.
- Application Support/: app data; back up if not easily regenerable.
- Caches/: purgeable; exclude from backups.
- Offer export/import (ZIP of JSON + attachments). Mark nonessential files with NSURLIsExcludedFromBackupKey.
- Recommend Advanced Data Protection for users who need end-to-end-encrypted iCloud backups.
