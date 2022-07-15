import Lineworks from './Lineworks';

function doPost(e: GoogleAppsScript.Events.DoPost) {
    if (e == null || e.postData == null || e.postData.contents == null) return
    const contents = JSON.parse(e.postData.contents);
    const eventType = contents.type;
    if (eventType) {
        onCallbackEvent(contents);
    }
}

function doGet(e: GoogleAppsScript.Events.DoGet) {
    //
}

function onCallbackEvent(e: any) {
    const eventType = e.type;
    const text = `type="${eventType}"\n\n` + JSON.stringify(e);
    const channelId = e.source.channelId;
    const userId = e.source.userId;
    sendLineworksBotTextMessage(text, userId, channelId);
    if (eventType == 'message') {
        const contentType = e.content.type;
        switch (contentType) {
            case 'text':
                onTextMessageEvent(e);
                return;
                break;
            default:
                break;
        }
    }
}

function onTextMessageEvent(e: Lineworks.Bot.Callback.TextMessage) {
    const channelId = e.source.channelId;
    const userId = e.source.userId;
    const text = `こんにちは、${Lineworks.Bot.Content.mention(userId)}さん！！\n「${e.content.text}」`;
    let quickReply: any = undefined;
    if (e.content.text == 'クイック') {
        quickReply = Lineworks.Bot.Content.quickReply(
            [
                Lineworks.Bot.Content.quickReplyItem(Lineworks.Bot.Action.Uri('https://line.worksmobile.com', 'LINE WORKS Homepage')),
                Lineworks.Bot.Content.quickReplyItem(Lineworks.Bot.Action.Camera('カメラ')),
                Lineworks.Bot.Content.quickReplyItem(Lineworks.Bot.Action.Location('現在地')),
            ]
        );
    }
    sendLineworksBotTextMessage(text, userId, channelId, quickReply);
}

function sendLineworksBotTextMessage(text: string, userId: string, channelId?: string, quickReply?: Lineworks.Bot.Content.quickReply) {
    const payloadText = Lineworks.Bot.Content.Text(text, undefined, quickReply);
    const appConfig = Lineworks.Util.getAppConfig();
    const accessToken = Lineworks.PlatformG.requestJwtAccessToken(appConfig).access_token;
    const botId = appConfig.userOption.botId;
    if (channelId) {
        Lineworks.Bot.Message.sendToChannel(channelId, payloadText, botId, accessToken);
    } else {
        Lineworks.Bot.Message.sendToUser(userId, payloadText, botId, accessToken);
    }
}