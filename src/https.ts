import MotionEye from './MotionEye';
import Lineworks from './Lineworks';

const sheetName = 'motioneye';
const postbackTag = 'motioneye';

function doPost(e: GoogleAppsScript.Events.DoPost) {
    PropertiesService.getScriptProperties().setProperty('doPost', e ? JSON.stringify(e) : '(null)');
    if (e == null || e.postData == null || e.postData.contents == null) return
    const contents = JSON.parse(e.postData.contents);
    if (contents.motioneye) {
        onMotionEye_(contents);
    } else if (contents.type) {
        onCallbackEvent_(contents);
    }
}

function doGet(e: GoogleAppsScript.Events.DoGet) {
    //
}

function execCleanUp() {
    const rootFolderId = Lineworks.Util.getAppConfig().userOption.storageFolderId;
    const days = Lineworks.Util.getAppConfig().userOption.storageCleanUpDays;
    if (days) {
        const r = MotionEye.setTrashedSubFolders(rootFolderId, days);
        Logger.log(r);
    }
}

function execCheckStorageFreeSize() {
    const storageLimit = DriveApp.getStorageLimit();
    const storageUsed = DriveApp.getStorageUsed();
    const storageFree = storageLimit - storageUsed;
    const storageFreeSizeThreshold = (Lineworks.Util.getAppConfig().userOption.storageFreeSizeThreshold || '2GB').toUpperCase();
    let thresholdBytes = storageLimit;
    if (storageFreeSizeThreshold.endsWith('GB')) {
        thresholdBytes = Number(storageFreeSizeThreshold.slice(0, -2)) * 1024 * 1024 * 1024;
    } else if (storageFreeSizeThreshold.endsWith('MB')) {
        thresholdBytes = Number(storageFreeSizeThreshold.slice(0, -2)) * 1024 * 1024;
    } else if (storageFreeSizeThreshold.endsWith('KB')) {
        thresholdBytes = Number(storageFreeSizeThreshold.slice(0, -2)) * 1024;
    } else if (storageFreeSizeThreshold.endsWith('B')) {
        thresholdBytes = Number(storageFreeSizeThreshold.slice(0, -1));
    } else {
        thresholdBytes = storageLimit;
    }
    const gb = (bytes: number) => {
        return (bytes / 1024 / 1024 / 1024).toFixed(1);
    };
    if (storageFree < thresholdBytes) {
        const text = `【ストレージ容量】(${storageFreeSizeThreshold})\n`
            + `全体:${gb(storageLimit)}GB\n`
            + `使用:${gb(storageUsed)}GB\n`
            + `空き:${gb(storageFree)}GB(<${gb(thresholdBytes)}GB)`
        sendTextMessage_(text);
    }
}

function executeRecreateSheet() {
    const spread = SpreadsheetApp.getActiveSpreadsheet();
    const newSheet = spread.insertSheet(0);
    newSheet.getRange(1, 1, 1, 4).setValues([['イベント番号', '発生日時', '写真', '動画']]);
    newSheet.getRange('B:B').setNumberFormat('yyyy/MM/dd H:mm:ss')
    newSheet.setColumnWidth(2, 160);
    newSheet.setColumnWidths(3, 2, 360);
    const oldSheet = spread.getSheetByName(sheetName);
    if (oldSheet) {
        spread.deleteSheet(oldSheet);
    }
    newSheet.setName(sheetName);
}

function executeDeleteSubfolders() {
    const rootFolderId = Lineworks.Util.getAppConfig().userOption.storageFolderId;
    const r = MotionEye.setTrashedSubFolders(rootFolderId, 0, true);
    Logger.log(r);
    Logger.log(`total: ${(r[0] as number) / 1024 / 1024 / 1024}GB`);
}

function onMotionEye_(e: any) {
    const n = MotionEye.conv(e);
    switch (n.eventType) {
        case 'started':
            MotionEye.setNotification(sheetName, n.eventNumber, n.eventDatetime);
            sendMotionEyeNotification_(n.eventNumber)
            break;
        case 'jpg':
            MotionEye.setFilepathJpg(sheetName, n.eventNumber, n.filepath);
            break;
        case 'mp4':
            MotionEye.setFilepathMp4(sheetName, n.eventNumber, n.filepath);
            break;
        default:
            break;
    }
}

function onCallbackEvent_(e: any) {
    if ((e.type == 'message') && (e.content.type == 'text') && (e.content.postback)) {
        const a = parsePostback_(e.content.postback);
        if ((a.tag == postbackTag) && (a.values.length > 0)) {
            let contentText: string;
            const eventNumber = parseInt(a.values[0], 10);
            const rootFolderId = Lineworks.Util.getAppConfig().userOption.storageFolderId;
            const r = MotionEye.getJpgUrlAndMp4Url(sheetName, eventNumber, rootFolderId)
            switch (r.result) {
                case 'uploading':
                    // アップロード中
                    contentText = `(アップロード中)\n[${e.content.text}]`;
                    sendTextMessage_(contentText);
                    break;
                case 'ok':
                    // OK
                    const title = `[${e.content.text}]`;
                    const subtitle = Utilities.formatDate(r.datetime, 'JST', 'yyyy/MM/dd HH:mm:ss');
                    sendMotionEyeFileUrls_(title, subtitle, r.fileUrlJpg, r.fileUrlMp4);
                    break;
                default:
                    // データなし
                    contentText = `(データなし)\n[${e.content.text}]`;
                    sendTextMessage_(contentText);
            }
        }
    }
}

function sendMotionEyeNotification_(eventNumber: number) {
    // Button Template
    // https://developers.worksmobile.com/jp/reference/bot-send-button?lang=ja
    const contentText = `動体検知`;
    const postback = buildPostback_(postbackTag, [eventNumber]);
    const actionsButtonTemplate = [
        Lineworks.Bot.Action.Message(`#${eventNumber}`, null, postback),
    ];
    const payload = Lineworks.Bot.Content.ButtonTemplate(contentText, actionsButtonTemplate);
    sendToChannel_(payload);
}

function sendMotionEyeFileUrls_(title: string, subtitle: string, fileUrlJpg: string, fileUrlMp4: string) {
    // List Template
    // https://developers.worksmobile.com/jp/reference/bot-send-list?lang=ja
    const elements = [
        Lineworks.Bot.Content.element(subtitle, undefined, undefined, undefined, Lineworks.Bot.Action.Uri(fileUrlMp4, '動画'))
    ];
    const coverData = Lineworks.Bot.Content.coverDataImageUri(fileUrlJpg, title, undefined);
    const payload = Lineworks.Bot.Content.ListTemplate(elements, [], coverData);
    sendToChannel_(payload);
}

function sendTextMessage_(text: string) {
    // Text
    // https://developers.worksmobile.com/jp/reference/bot-send-text?lang=ja
    const payload = Lineworks.Bot.Content.Text(text);
    sendToChannel_(payload);
}

function sendToChannel_(payload: Lineworks.Bot.Content.Text | Lineworks.Bot.Content.ButtonTemplate | Lineworks.Bot.Content.ListTemplate) {
    var lock = LockService.getScriptLock();
    lock.waitLock(1000 * 30);
    try {
        const appConfig = Lineworks.Util.getAppConfig();
        const accessToken = Lineworks.PlatformG.requestJwtAccessToken(appConfig).access_token;
        const botId = appConfig.userOption.botId;
        const channelId = appConfig.userOption.channelId;
        Lineworks.Bot.Message.sendToChannel(channelId, payload, botId, accessToken);
    } finally {
        lock.releaseLock();
    }
}

function buildPostback_(tag: string, values: any[]) {
    const a = [tag, ...values];
    return a.join('_');
}

function parsePostback_(postback: string) {
    const a = postback.split('_');
    return {
        tag: a[0],
        values: a.slice(-1 * (a.length - 1)),
    }
}

function testSendToChannel() {
    sendMotionEyeNotification_(-1);
    sendMotionEyeFileUrls_('(タイトル)','(サブタイトル)', 'https://example.com/fileurl/jpg', 'https://example.com/fileurl/mp4');
    sendTextMessage_('(テスト - メッセージ)');
}

function testPostbackBuildAndParse() {
    const s = buildPostback_('test', [123]);
    Logger.log(s);
    const j = parsePostback_(s);
    Logger.log(j);
}
