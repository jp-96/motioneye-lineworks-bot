// 
namespace MotionEye {
    const defaultRecordLimited: number = 1000;

    /**
     * Motion eye notification
     *      [post url]?motioneye=started&&year=%Y&&month=%m&&day=%d&&hour=%H&&minute=%M&&second=%S&&framenumber=%q&&eventnumber=%v
     *      [post url]?motioneye=storage&&year=%Y&&month=%m&&day=%d&&hour=%H&&minute=%M&&second=%S&&framenumber=%q&&eventnumber=%v&&filepath=%f
     */
    export interface Notification {
        eventNumber: number;
        eventDatetime: Date;
        eventType: ('started' | 'jpg' | 'mp4' | 'unknown');
        filepath: string;
    }

    /**
     * 
     * @param contents
     * @returns 
     */
    export function conv(contents: any): Notification {
        const r: Notification = {
            eventNumber: contents.eventnumber as number,
            eventDatetime: new Date(contents.year, contents.month, contents.day, contents.hour, contents.minute, contents.second),
            eventType: 'started',
            filepath: '',
        }
        const a = splitPath(contents.filepath);
        if (a) {
            switch (a[0]) {
                case 'jpg':
                    r.eventType = 'jpg';
                    break;
                case 'mp4':
                    r.eventType = 'mp4';
                    break;
                default:
                    r.eventType = 'unknown';
                    break;
            }
            r["filepath"] = contents.filepath;
        }
        return r;
    }

    function splitPath(filepath: string) {
        if (!filepath) {
            return null;
        }
        const a = filepath.split("/");
        if (a.length > 2) {
            const folderName = a[a.length - 2];
            const fileName = a[a.length - 1];
            const b = fileName.split(".");
            const extName = b[b.length - 1];
            return [extName, fileName, folderName];
        } else {
            return null;
        }
    }

    function getFileId(fileName: string, subFolderName: string, rootFolderId: string) {
        const rootFolder = DriveApp.getFolderById(rootFolderId);
        if (!rootFolder) {
            return null;
        }
        const subFolder = rootFolder.getFoldersByName(subFolderName).next();
        if (!subFolder) {
            return null;
        }
        const targetFile = subFolder.getFilesByName(fileName).next();
        if (targetFile) {
            return targetFile.getId();
        } else {
            return null
        }
    }

    function getFileUrl(filepath: string, rootFolderId: string, isExportView = false) {
        const a = splitPath(filepath);
        if (a) {
            try {
                const fileId = getFileId(a[1], a[2], rootFolderId);
                return isExportView ? `https://drive.google.com/uc?export=view&id=${fileId}` : `https://drive.google.com/file/d/${fileId}`;
            } catch (e) {
                return null;
            }
        } else {
            return null;
        }
    }

    function getSheetAndRowPos(sheetName: string, eventNumber: number, recordLimited: number): [GoogleAppsScript.Spreadsheet.Sheet, number] {
        const spread = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spread.getSheetByName(sheetName);
        if (!sheet) {
            throw `シートが存在しません(シート名: ${sheetName})。`;
        }
        const rowIndex = ((eventNumber - 1) % recordLimited);
        const rowPos = rowIndex + 2;
        return [sheet, rowPos];
    }

    export function setFilepathJpg(sheetName: string, eventNumber: number, filepath: string, recordLimited: number = defaultRecordLimited) {
        const [sheet, rowPos] = getSheetAndRowPos(sheetName, eventNumber, recordLimited);
        sheet.getRange(rowPos, 3).setValue(filepath);
    }

    export function setFilepathMp4(sheetName: string, eventNumber: number, filepath: string, recordLimited: number = defaultRecordLimited) {
        const [sheet, rowPos] = getSheetAndRowPos(sheetName, eventNumber, recordLimited);
        sheet.getRange(rowPos, 4).setValue(filepath);
    }

    export function setNotification(sheetName: string, eventNumber: number, eventDatetime: Date, recordLimited: number = defaultRecordLimited) {
        const [sheet, rowPos] = getSheetAndRowPos(sheetName, eventNumber, recordLimited);
        sheet.getRange(rowPos, 1, 1, 4).setValues([
            [
                eventNumber,
                eventDatetime,
                null,   // jpg filepath
                null,   // mp4 filepath
            ]
        ]);
    }

    export type JpgUrlAndMp4Url = JpgUrlAndMp4UrlUploading | JpgUrlAndMp4UrlOk | JpgUrlAndMp4UrlMissing;
    interface JpgUrlAndMp4UrlUploading {
        result: 'uploading';
    }
    interface JpgUrlAndMp4UrlOk {
        result: 'ok';
        fileUrlJpg: string;
        fileUrlMp4: string;
        datetime: Date;
    }
    interface JpgUrlAndMp4UrlMissing {
        result: 'missing';
    }
    
    export function getJpgUrlAndMp4Url(sheetName: string, eventNumber: number, rootFolderId: string, recordLimited: number = defaultRecordLimited): JpgUrlAndMp4Url {
        const [sheet, rowPos] = getSheetAndRowPos(sheetName, eventNumber, recordLimited);
        const record = sheet.getRange(rowPos, 1, 1, 4).getValues()[0];
        if (record[0] == eventNumber) {
            const fileUrlJpg = getFileUrl(record[2], rootFolderId, true);
            const fileUrlMp4 = getFileUrl(record[3], rootFolderId);
            if ((fileUrlJpg) && (fileUrlMp4)) {
                // 写真・動画あり
                return {
                    result: 'ok',
                    fileUrlJpg,
                    fileUrlMp4,
                    datetime: record[1],
                };
            } else {
                // アップロード中
                return {
                    result: 'uploading',
                };
            }
        } else {
            // データなし（シートに存在しない）
            return {
                result: 'missing',
            };
        }
    }

    export function setTrashedSubFolders(rootFolderId: string, days: number, test = false) {
        let deletedTotalSize = 0;
        let deletedFolderNames: string[] = [];
        const rootFolder = DriveApp.getFolderById(rootFolderId);
        if (rootFolder) {
            const targetDatetime = new Date();
            targetDatetime.setDate(targetDatetime.getDate() - days);
            const targetTime = targetDatetime.getTime();
            const subFolders = rootFolder.getFolders();
            while (subFolders.hasNext()) {
                const folder = subFolders.next();
                const updated = folder.getLastUpdated();
                if (updated.getTime() < targetTime) {
                    deletedTotalSize += calcFolderSize(folder);
                    deletedFolderNames.push(folder.getName());
                    if (!test) {
                        folder.setTrashed(true);
                    }
                }
            }
        }
        return [deletedTotalSize, deletedFolderNames];
    }

    function calcFolderSize(folder: GoogleAppsScript.Drive.Folder): number {
        let total = 0;
        const subFolders = folder.getFolders();
        while (subFolders.hasNext()) {
            const subFolder = subFolders.next();
            total += calcFolderSize(subFolder);
        }
        const files = folder.getFiles();
        while (files.hasNext()) {
            const file = files.next();
            total += file.getSize();
        }
        return total;
    }

}

export default MotionEye;