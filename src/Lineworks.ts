/**
 * LINE WORKS API 2.0
 * https://developers.worksmobile.com/jp/reference/introduction?lang=ja
 */
namespace Lineworks {
    export namespace PlatformG {

        export function readTextFromFile(filename: string) {
            const text = HtmlService.createHtmlOutputFromFile(filename.slice(0, -5)).getContent();
            return text;
        }

        function getJwtRs256(clientId: string, serviceAccount: string, privateKey: string, expIn: number = 3600): string {
            const iat: number = Math.floor(Date.now() / 1000);
            const exp: number = iat + expIn;
            const payload: OAuth2.JwtClaimset = {
                iss: clientId,
                sub: serviceAccount,
                iat: iat,
                exp: exp,
            };
            const header: OAuth2.JwtHeader = {
                alg: 'RS256',
                typ: 'JWT',
            };
            const jwtsign = (header: any, payload: any, privateKey: string) => {
                const base64Encode = (data: any, isSignature: boolean = false) => {
                    if (isSignature) {
                        return Utilities.base64EncodeWebSafe(data).replace(/=+$/, '');
                    }
                    return Utilities.base64EncodeWebSafe(JSON.stringify(data));
                }
                return ((value, key) => {
                    return value + '.' + base64Encode(Utilities.computeRsaSha256Signature(value, key), true);
                })(base64Encode(header) + '.' + base64Encode(payload), privateKey);
            };
            const jwt = jwtsign(header, payload, privateKey);
            return jwt;
        }

        function getNewJwtAccessToken(jwt: string, clientId: string, clientSecret: string, scopes: string): OAuth2.AccessToken {
            const url = OAuth2.buildUrl();
            const payload: OAuth2.RequestBody = {
                assertion: jwt,
                grant_type: encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer'),
                client_id: clientId,
                client_secret: clientSecret,
                scope: scopes,
            };
            const options = OAuth2.buildFetchOptions(payload);
            const response = fetch(url, options);
            const token = JSON.parse(response.contentText as string);
            return token;
        }

        export function requestJwtAccessToken(appConfig: Util.AppConfig, scopes: string = 'bot'): OAuth2.AccessToken {
            const jwt = getJwtRs256(appConfig.clientId, appConfig.serviceAccount, appConfig.privateKey);
            //Logger.log(jwt);
            const token = getNewJwtAccessToken(jwt, appConfig.clientId, appConfig.clientSecret, scopes);
            //Logger.log(token);
            return token;
        }

        /**
         * Access Tokenの再発行
         * https://developers.worksmobile.com/jp/reference/authorization-auth?lang=ja
         * @param refresh_token 
         * @returns 
         */
        export function refreshJwtAccessToken(refresh_token: string, appConfig: Util.AppConfig): OAuth2.RefreshedToken {
            const url = OAuth2.buildUrl();
            const payload: OAuth2.RefreshBody = {
                refresh_token: refresh_token,
                grant_type: 'refresh_token',
                client_id: appConfig.clientId,
                client_secret: appConfig.clientSecret,
            }
            const options = OAuth2.buildFetchOptions(payload);
            const response = fetch(url, options);
            const token = JSON.parse(response.contentText as string);
            return token;
        }

        export function concatMultipart(partHeader: string[], data: number[], partFooter: string[]): number[] {
            const multipart = Utilities.newBlob(partHeader.join('\r\n')).getBytes()
                .concat(data).concat(Utilities.newBlob(partFooter.join('\r\n')).getBytes())
            return multipart;
        }

        export function fetch(url: string, options: OAuth2.FetchOptions | Bot.Message.FetchOptions | Bot.Attachment.FetchPostOptions | Bot.Attachment.FetchGetOptions | File.FetchOptions): Util.FetchResponse {
            const params: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
                method: options.method,
                headers: options.headers,
                // muteHttpExceptions: true,
            }
            const payload = options['body'];
            if (payload) {
                params.payload = payload;
            }
            const contentType = options['contentType'];
            if (contentType) {
                params.contentType = contentType;
            }
            const followRedirects = options['followRedirects'];
            if (followRedirects) {
                params.followRedirects = followRedirects;
            }
            //const request = UrlFetchApp.getRequest(url, params);
            //Logger.log(request);
            const response = UrlFetchApp.fetch(url, params);
            //Logger.log(response);
            //Logger.log(response.getResponseCode());
            const fetchResponse: Util.FetchResponse = {
                responseCode: response.getResponseCode(),
            }
            if ((fetchResponse.responseCode != 200) && (fetchResponse.responseCode != 201)) {
                throw `fetch error, response code: ${fetchResponse.responseCode}`;
            }
            const headers = response.getHeaders();
            if (headers) {
                fetchResponse.headers = headers;
            }
            const contentText = response.getContentText();
            if (contentText) {
                fetchResponse.contentText = contentText;
            }
            const blob = response.getBlob();
            if (blob) {
                fetchResponse.blob = blob;
            }
            return fetchResponse;
        }
    }

    export namespace Util {

        export const ConfigPath = 'private_lineworks.config.json.html';

        /**
         * Lineworks アプリ構成情報
         */
        export interface AppConfig {
            clientId: string,
            clientSecret: string,
            serviceAccount: string,
            privateKey: string,
            userOption?: any,
        }

        /**
         * Lineworks 構成情報をHTMLファイルから取得します。
         * @returns 
         */
        export function getAppConfig(config?: any, readTextFromFile = PlatformG.readTextFromFile): Util.AppConfig {
            if (!config) {
                config = getConfig(Util.ConfigPath, readTextFromFile);
            }
            for (const app of config.apps) {
                if (app.label == config.defaultAppLabel) {
                    var appConfig: Util.AppConfig = {
                        clientId: app.clientId,
                        clientSecret: app.clientSecret,
                        serviceAccount: app.serviceAccount,
                        privateKey: readTextFromFile(app.privateKeyFilename),
                    }
                    if (app.userOption) {
                        appConfig.userOption = app.userOption;
                    }
                    return appConfig;
                }
            }
            throw `Unknown label: "${config.defaultAppLabel}"`;
        }

        var defaultConfig = null;
        export function getConfig(filename = Util.ConfigPath, readTextFromFile = PlatformG.readTextFromFile) {
            if (!defaultConfig) {
                defaultConfig = JSON.parse(readTextFromFile(filename));
            }
            return defaultConfig;
        }

        export interface FetchResponse {
            responseCode: number;
            headers?: any;
            contentText?: string;
            blob?: any;
        }
    }

    /**
     * Service Account認証 (JWT)
     * https://developers.worksmobile.com/jp/reference/authorization-sa?lang=ja
     */
    export namespace OAuth2 {

        export interface JwtHeader {
            alg: alg;
            typ: typ;
        };
        export type alg = 'RS256';
        export type typ = 'JWT';

        export interface JwtClaimset {
            iss: string;
            sub: string;
            iat: number;
            exp: number;
        };

        export function buildUrl() {
            return 'https://auth.worksmobile.com/oauth2/v2.0/token';
        }

        export function buildFetchOptions(formBody: formBody): FetchOptions {
            return {
                method: 'post',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formBody,
            };
        }

        export interface FetchOptions {
            method: postMethod;
            headers: {
                'Content-Type': formContentType;
            };
            body: formBody;
        };
        export type postMethod = 'post';
        export type formContentType = 'application/x-www-form-urlencoded';
        export type formBody = RequestBody | RefreshBody;

        export interface RequestBody {
            assertion: string;
            grant_type: string;
            client_id: string;
            client_secret: string;
            scope: string;
        }

        export interface RefreshBody {
            refresh_token: string;
            grant_type: string;
            client_id: string;
            client_secret: string;
        }

        export interface AccessToken {
            access_token: string;
            refresh_token: string;
            token_type: string;
            expires_in: number;
            scope: string;
        }

        export interface RefreshedToken {
            access_token: string;
            scope: string;
            expires_in: number;
            token_type: string;
        }

    }

    /**
     * トークBot API (メッセージ送信)
     * https://developers.worksmobile.com/jp/reference/bot?lang=ja
     */
    export namespace Bot {

        /**
         * トーク共通プロパティ
         * https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
         */
        export namespace Content {

            // Action Objects
            export type action = Action.Postback | Action.Message | Action.Uri | Action.Camera | Action.CameraRoll | Action.Location
            export type actions = action[];
            export type actionMatrix = action[][];

            // クイック返信 (quick reply) 
            // https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
            export interface quickReply {
                items: quickReplyItems;
            }
            export function quickReply(items: quickReplyItems): quickReply {
                return {
                    items
                };
            }
            export type quickReplyItems = quickReplyItem[];
            export interface quickReplyItem {
                imageUrl?: string;
                action: action;
                i18nImageUrl?: I18N.i18nImageUrls;
                imageResourceId?: string;
                i18nImageResourceIds?: I18N.i18nImageResourceIds;
            }
            export function quickReplyItem(action: action, imageUrl?: string, imageResourceId?: string, i18nImageUrl?: I18N.i18nImageUrls, i18nImageResourceIds?: I18N.i18nImageResourceIds) {
                const item: quickReplyItem = {
                    action
                };
                if (imageUrl) {
                    item['imageUrl'] = imageUrl;
                }
                if (imageResourceId) {
                    item['imageResourceId'] = imageResourceId;
                }
                if (i18nImageUrl) {
                    item['i18nImageUrl'] = i18nImageUrl;
                }
                if (i18nImageResourceIds) {
                    item['i18nImageResourceIds'] = i18nImageResourceIds;
                }
                return item;
            }

            // メンバーへのメンション (mention) 
            // https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
            export function mention(userId?: string) {
                if (userId) {
                    return `<m userId="${userId}">`;
                }
                return '<m userId="all">';
            }

            // Text
            // https://developers.worksmobile.com/jp/reference/bot-send-text?lang=ja
            export interface Text {
                content: {
                    type: 'text';
                    text: string;
                    i18nTexts?: I18N.i18nTexts;
                    quickReply?: quickReply;
                };
            };
            export function Text(text: string, i18nTexts?: I18N.i18nTexts, quickReply?: quickReply) {
                const type = 'text';
                const payload: Text = {
                    content: {
                        type,
                        text,
                    },
                };
                if (i18nTexts) {
                    payload.content['i18nTexts'] = i18nTexts;
                }
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }

            // Image
            // https://developers.worksmobile.com/jp/reference/bot-send-image?lang=ja
            export type Image = ImageUrl | ImageFileId;
            export interface ImageUrl {
                content: {
                    type: 'image';
                    previewImageUrl: string;
                    originalContentUrl: string;
                    quickReply?: quickReply;
                }
            };
            export function ImageUrl(previewImageUrl: string, originalContentUrl: string, quickReply?: quickReply) {
                // URL 方式
                const type = 'image';
                const payload: ImageUrl = {
                    content: {
                        type,
                        previewImageUrl,
                        originalContentUrl,
                    },
                };
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }
            export interface ImageFileId {
                content: {
                    type: 'image';
                    fileId: string;
                    quickReply?: quickReply;
                }
            };
            export function ImageFileId(fileId: string, quickReply?: quickReply) {
                // ファイル ID 方式
                const type = 'image';
                const payload: ImageFileId = {
                    content: {
                        type,
                        fileId,
                    },
                };
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }
            export function Image(previewImageUrl: string, originalContentUrl: string): Image;
            export function Image(fileId: string): Image;
            export function Image(arg1: string, arg2?: string): Image {
                if (arg2) {
                    // URL 方式
                    return ImageUrl(arg1, arg2);
                } else {
                    // ファイル ID 方式
                    return ImageFileId(arg1);
                }
            }

            // Link
            // https://developers.worksmobile.com/jp/reference/bot-send-link?lang=ja
            export interface Link {
                content: {
                    type: 'link';
                    contentText: string;
                    i18nContentTexts?: I18N.i18nContentTexts;
                    linkText: string;
                    i18nLinkTexts?: I18N.i18nLinkTexts;
                    link: string;
                    quickReply?: quickReply;
                };
            };
            export function Link(contentText: string, linkText: string, link: string, i18nContentTexts?: I18N.i18nContentTexts, i18nLinkTexts?: I18N.i18nLinkTexts, quickReply?: quickReply) {
                const type = 'link';
                const payload: Link = {
                    content: {
                        type,
                        contentText,
                        linkText,
                        link,
                    },
                };
                if (i18nContentTexts) {
                    payload.content['i18nContentTexts'] = i18nContentTexts;
                }
                if (i18nLinkTexts) {
                    payload.content['i18nLinkTexts'] = i18nLinkTexts;
                }
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }

            // Stamp
            // https://developers.worksmobile.com/jp/reference/bot-send-sticker?lang=ja
            // https://static.worksmobile.net/static/wm/media/message-bot-api/line_works_sticker_list_new.pdf
            export interface Stamp {
                content: {
                    type: 'sticker';
                    packageId: string;
                    stickerId: string;
                    quickReply?: quickReply;
                };
            };
            export function Stamp(packageId: string, stickerId: string, quickReply?: quickReply) {
                const type = 'sticker';
                const payload: Stamp = {
                    content: {
                        type,
                        packageId,
                        stickerId,
                    },
                };
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }

            // ButtonTemplate
            // https://developers.worksmobile.com/jp/reference/bot-send-button?lang=ja
            export interface ButtonTemplate {
                content: {
                    type: 'button_template';
                    contentText: string;
                    i18nContentTexts?: I18N.i18nContentTexts;
                    actions: actions;
                    quickReply?: quickReply;
                };
            };
            export function ButtonTemplate(contentText: string, actions: actions, quickReply?: quickReply) {
                const type = 'button_template';
                const payload: ButtonTemplate = {
                    content: {
                        type,
                        contentText,
                        actions,
                    },
                };
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }

            // ListTemplate
            // https://developers.worksmobile.com/jp/reference/bot-send-list?lang=ja
            export interface ListTemplate {
                content: {
                    type: 'list_template';
                    elements: elements;
                    actions: actionMatrix;  // actions 下部のボタン。1つ目の配列は行、2つ目の配列は列を表す。
                    coverData?: coverData;
                    quickReply?: quickReply;
                },
            };
            export function ListTemplate(elements: any[], actions: actionMatrix, coverData?: coverData, quickReply?: quickReply) {
                const type = 'list_template';
                const payload: ListTemplate = {
                    content: {
                        type,
                        elements,
                        actions,
                    },
                };
                if (coverData) {
                    payload.content['coverData'] = coverData;
                }
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }
            export interface coverData {
                backgroundImageUrl?: string;
                backgroundFileId?: string;
                title?: string;
                subtitle?: string;
            };
            export function coverData(backgroundImageUrl?: string, backgroundFileId?: string, title?: string, subtitle?: string) {
                const coverData: coverData = {};
                if (backgroundImageUrl) {
                    coverData['backgroundImageUrl'] = backgroundImageUrl;
                } else if (backgroundFileId) {
                    coverData['backgroundFileId'] = backgroundFileId;
                }
                if (title) {
                    coverData['title'] = title;
                }
                if (subtitle) {
                    coverData['subtitle'] = subtitle;
                }
                return coverData;
            }
            export function coverDataImageUri(backgroundImageUrl: string, title?: string, subtitle?: string) {
                return coverData(backgroundImageUrl, undefined, title, subtitle);
            }
            export function coverDataFileId(backgroundFileId: string, title?: string, subtitle?: string) {
                return coverData(undefined, backgroundFileId, title, subtitle);
            }
            export type elements = element[];
            export interface element {
                title: string;
                subtitle?: string;
                originalContentUrl?: string;
                fileId?: string;
                action?: action;
            };
            export function element(title: string, subtitle?: string, originalContentUrl?: string, fileId?: string, action?: action) {
                const element: element = {
                    title,
                };
                if (subtitle) {
                    element['subtitle'] = subtitle;
                }
                if (originalContentUrl) {
                    element['originalContentUrl'] = originalContentUrl;
                } else if (fileId) {
                    element['fileId'] = fileId;
                }
                if (action) {
                    element['action'] = action;
                }
                return element;
            }
            export function elementUri(originalContentUrl: string, title: string, subtitle?: string, action?: action) {
                return element(title, subtitle, originalContentUrl, undefined, action);
            }
            export function elementFileId(fileId: string, title: string, subtitle?: string, action?: action) {
                return element(title, subtitle, undefined, fileId, action);
            }

            // Carousel
            // https://developers.worksmobile.com/jp/reference/bot-send-carousel?lang=ja
            /**
             * ToDo: Carousel
             */
            export type Carousel = any;

            // Image Carousel
            // https://developers.worksmobile.com/jp/reference/bot-send-imagecarousel?lang=ja
            /**
             * ToDo: Image Carousel
             */
            export type ImageCarousel = any;

            // File
            // https://developers.worksmobile.com/jp/reference/bot-send-file?lang=ja
            export type File = FileUrl | FileFileId;
            export interface FileUrl {
                content: {
                    type: 'file';
                    originalContentUrl: string;
                    quickReply?: quickReply;
                }
            };
            export function FileUrl(originalContentUrl: string, quickReply?: quickReply): File {
                const type = 'file';
                const payload: FileUrl = {
                    content: {
                        type,
                        originalContentUrl,
                    },
                };
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }
            export interface FileFileId {
                content: {
                    type: 'file';
                    fileId: string;
                    quickReply?: quickReply;
                }
            };
            export function FileId(fileId: string, quickReply?: quickReply): File {
                const type = 'file';
                const payload: FileFileId = {
                    content: {
                        type,
                        fileId,
                    },
                };
                if (quickReply) {
                    payload.content['quickReply'] = quickReply;
                }
                return payload;
            }

            // Flexible Template
            // https://developers.worksmobile.com/jp/reference/bot-send-flex?lang=ja
            /**
             * ToDo: Flexible Template
             */
            export type FlexibleTemplate = any;

        }

        /**
         * i18n - internationalization
         */
        export namespace I18N {

            // language
            export type language = 'ja_JP' | 'ko_KR' | 'zh_CN' | 'zh_TW' | 'en_US';

            // i18nImageUrl
            export type i18nImageUrls = i18nImageUrl[];
            export interface i18nImageUrl {
                language: language;
                thumbnailImageUrl: string;
            }
            export function i18nImageUrl(language: language, thumbnailImageUrl: string): i18nImageUrl {
                return {
                    language,
                    thumbnailImageUrl,
                }
            }
            // i18nImageResourceId
            export type i18nImageResourceIds = i18nImageResourceId[];
            export interface i18nImageResourceId {
                language: language;
                imageResourceId: string;
            }
            export function i18nImageResourceId(language: language, imageResourceId: string): i18nImageResourceId {
                return {
                    language,
                    imageResourceId,
                }
            }
            // i18nText
            export type i18nTexts = i18nText[];
            export interface i18nText {
                language: language;
                text: string;
            };
            export function i18nText(language: language, text: string): i18nText {
                return {
                    language,
                    text,
                }
            }
            // i18nContentText
            export type i18nContentTexts = i18nContentText[];
            export interface i18nContentText {
                language: language;
                contentText: string;
            };
            export function i18nContentText(language: language, contentText: string): i18nContentText {
                return {
                    language,
                    contentText,
                }
            }
            // i18nLinkText
            export type i18nLinkTexts = i18nLinkText[];
            export interface i18nLinkText {
                language: language;
                linkText: string;
            };
            export function i18nLinkText(language: language, linkText: string): i18nLinkText {
                return {
                    language,
                    linkText,
                }
            }
            // i18nLabel
            export type i18nLabels = i18nLabel[];
            export interface i18nLabel {
                language: language;
                label: string;
            };
            export function i18nLabel(language: language, label: string): i18nLabel {
                return {
                    language,
                    label,
                }
            }
            // i18nDisplayText
            export type i18nDisplayTexts = i18nDisplayText[];
            export interface i18nDisplayText {
                language: language;
                displayText: string;
            };
            export function i18nDisplayText(language: language, displayText: string): i18nDisplayText {
                return {
                    language,
                    displayText,
                }
            }

        }

        /**
         * Action Objects
         * https://developers.worksmobile.com/jp/reference/bot-actionobject?lang=ja
         */
        export namespace Action {

            // Postback Action
            export interface Postback {
                type: 'postback';
                labal?: string;
                data: string;
                displayText?: string;
                i18nLabels?: I18N.i18nLabels;
                i18nDisplayTexts?: I18N.i18nDisplayTexts;
            };
            export function Postback(data: string, label?: string, displayText?: string, i18nLabels?: I18N.i18nLabels, i18nDisplayTexts?: I18N.i18nDisplayTexts) {
                const type = 'postback';
                const action: Postback = {
                    type,
                    data,
                }
                if (label) {
                    action['label'] = label;
                }
                if (displayText) {
                    action['displayText'] = displayText;
                }
                if (i18nLabels) {
                    action['i18nLabels'] = i18nLabels;
                }
                if (i18nDisplayTexts) {
                    action['i18nDisplayTexts'] = i18nDisplayTexts;
                }
                return action;
            }

            // Message Action
            export interface Message {
                type: 'message';
                label?: string;
                text?: string;
                postback?: string;
                i18nLabels?: I18N.i18nLabels;
                i18nTexts?: I18N.i18nTexts;
            };
            export function Message(label?: string, text?: string, postback?: string, i18nLabels?: I18N.i18nLabels, i18nTexts?: I18N.i18nTexts) {
                const type = 'message';
                const action: Message = {
                    type,
                };
                if (label) {
                    action['label'] = label;
                }
                if (text) {
                    action['text'] = text;
                }
                if (postback) {
                    action['postback'] = postback;
                }
                if (i18nLabels) {
                    action['i18nLabels'] = i18nLabels;
                }
                if (i18nTexts) {
                    action['i18nTexts'] = i18nTexts;
                }
                return action;
            }

            // URI Action
            export interface Uri {
                type: 'uri';
                label?: string;
                uri: string;
                i18nLabels?: I18N.i18nLabels;
            };
            export function Uri(uri: string, label?: string, i18nLabels?: I18N.i18nLabels) {
                const type = 'uri';
                const action: Uri = {
                    type,
                    uri,
                };
                if (label) {
                    action['label'] = label;
                }
                if (i18nLabels) {
                    action['i18nLabels'] = i18nLabels;
                }
                return action;
            }

            // Camera Action
            export interface Camera {
                type: 'camera';
                label: string;
                i18nLabels?: I18N.i18nLabels;
            }
            export function Camera(label: string, i18nLabels?: I18N.i18nLabels) {
                const type = 'camera';
                const action: Camera = {
                    type,
                    label,
                };
                if (i18nLabels) {
                    action['i18nLabels'] = i18nLabels;
                }
                return action;
            }

            // Camera Roll Action
            export interface CameraRoll {
                type: 'cameraRoll';
                label: string;
                i18nLabels?: I18N.i18nLabels;
            }
            export function CameraRoll(label: string, i18nLabels?: I18N.i18nLabels) {
                const type = 'cameraRoll';
                const action: CameraRoll = {
                    type,
                    label,
                };
                if (i18nLabels) {
                    action['i18nLabels'] = i18nLabels;
                }
                return action;
            }

            // Location Action
            export interface Location {
                type: 'location';
                label: string;
                i18nLabels?: I18N.i18nLabels;
            }
            export function Location(label: string, i18nLabels?: I18N.i18nLabels) {
                const type = 'location';
                const action: Location = {
                    type,
                    label,
                };
                if (i18nLabels) {
                    action['i18nLabels'] = i18nLabels;
                }
                return action;
            }

        }

        /**
         * メッセージ送信
         */
        export namespace Message {
            // https://developers.worksmobile.com/jp/reference/bot-user-message-send?lang=ja
            export function buildUrlSendToUser(botId: string, userId: string) {
                return `https://www.worksapis.com/v1.0/bots/${botId}/users/${userId}/messages`;
            }
            // https://developers.worksmobile.com/jp/reference/bot-channel-message-send?lang=ja
            export function buildUrlSendToChannel(botId: string, channelId: string) {
                return `https://www.worksapis.com/v1.0/bots/${botId}/channels/${channelId}/messages`;
            }
            export function buildFetchOptions(accessToken: string, content: content): FetchOptions {
                return {
                    method: 'post',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(content),
                };
            }
            export interface FetchOptions {
                method: postMethod;
                headers: {
                    'Authorization': string;
                    'Content-Type': jsonContentType;
                };
                body: string;
            };
            export type postMethod = 'post';
            export type jsonContentType = 'application/json';
            export type content
                = Content.Text
                | Content.Image
                | Content.Link
                | Content.Stamp
                | Content.ButtonTemplate
                | Content.ListTemplate
                | Content.Carousel
                | Content.ImageCarousel
                | Content.File
                | Content.FlexibleTemplate;

            // メッセージ送信 - ユーザー
            // https://developers.worksmobile.com/jp/reference/bot-user-message-send?lang=ja
            export function sendToUser(userId: string, payload: any, botId: string, accessToken: string, fetch = PlatformG.fetch) {
                const url = buildUrlSendToUser(botId, userId);
                const options = buildFetchOptions(accessToken, payload);
                const response = fetch(url, options);
                return response;
            }

            // メッセージ送信 - トークルーム
            // https://developers.worksmobile.com/jp/reference/bot-channel-message-send?lang=ja
            export function sendToChannel(channelId: string, payload: any, botId: string, accessToken: string, fetch = PlatformG.fetch) {
                const url = buildUrlSendToChannel(botId, channelId);
                const options = buildFetchOptions(accessToken, payload);
                const response = fetch(url, options);
                return response;
            }
        }

        export namespace Attachment {
            export function buildUrlPost(botId: string) {
                return `https://www.worksapis.com/v1.0/bots/${botId}/attachments`;
            }
            export function buildFetchPostOptions(accessToken: string, content: content): FetchPostOptions {
                return {
                    method: 'post',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(content),
                };
            }
            export interface FetchPostOptions {
                method: postMethod;
                headers: {
                    'Authorization': string;
                    'Content-Type': jsonContentType;
                };
                body: string;
            };
            export type postMethod = 'post';
            export type jsonContentType = 'application/json';
            export interface content {
                fileName: string;
            };

            export interface FileInfo {
                fileId: string;
                uploadUrl: string;
            }

            /**
             * コンテンツアップロード (fileIdとuploadUrlの生成)
             * https://developers.worksmobile.com/jp/reference/bot-attachment-create?lang=ja
             * @param fileName 
             * @param botId 
             * @param access_token 
             * @returns 
             */
            export function createFile(fileName: string, botId: string, access_token: string, fetch = PlatformG.fetch): FileInfo {
                const url = buildUrlPost(botId);
                const payload: content = {
                    fileName: fileName,
                }
                const options = buildFetchPostOptions(access_token, payload);
                const response = fetch(url, options);
                const content = JSON.parse(response.contentText as string);
                return content;
            }

            export function buildUrlGet(botId: string, fileId: string) {
                return `https://www.worksapis.com/v1.0/bots/${botId}/attachments/${fileId}`;
            }
            export function buildFetchGetOptions(accessToken: string, followRedirects: boolean): FetchGetOptions {
                return {
                    method: 'get',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    followRedirects: followRedirects,
                };
            }
            export interface FetchGetOptions {
                method: getMethod;
                headers: {
                    'Authorization': string;
                };
                followRedirects: boolean;
            };
            export type getMethod = 'get';

            /**
             * コンテンツダウンロード (ダウンロードするためのURLを取得)
             * https://developers.worksmobile.com/jp/reference/bot-attachment-get?lang=ja
             * @param fileId 
             * @param botId 
             * @param access_token 
             * @param followRedirects trueの場合、ファイルをダウンロードする。falseの場合、ダウンロードURLを返す
             * @returns ダウンロードしたファイル または ダウンロードURL(Location)
             */
            export function getFileLocation(fileId: string, botId: string, access_token: string, followRedirects = false, fetch = PlatformG.fetch) {
                const url = buildUrlGet(botId, fileId);
                const options = buildFetchGetOptions(access_token, followRedirects);
                const response = fetch(url, options);
                //Logger.log(response);
                if (followRedirects) {
                    return response.blob;
                }
                const locationUrl = response.headers['Location']
                return locationUrl;
            }

        }

        /**
         * メッセージ(Callback) 受信
         * https://developers.worksmobile.com/jp/reference/bot-callback?lang=ja
         */
        export namespace Callback {
            export type EventType = (MessageType | JoinType | LeaveType | JoinedType | LeftType | PostbackType);
            export type MessageType = 'message';    // メンバーからのメッセージ
            export type JoinType = 'join';          // Bot が複数人トークルームに招待された
            export type LeaveType = 'leave';        // Bot が複数人トークルームから退室した
            export type JoinedType = 'joined';      // メンバーが Bot のいる複数人トークルームに参加した
            export type LeftType = 'left';          // メンバーが Bot のいる複数人トークルームから退室した
            export type PostbackType = 'postback';  // postback タイプのメッセージ
            export interface Event {
                type: EventType;        // "message", "join", "leave", "joined", "left", "postback"
                issuedTime: string;     // メッセージが作成された日時。(YYYY-MM-DDThh:mm:ss.SSSZ)
            }
            // https://developers.worksmobile.com/jp/reference/bot-callback-message?lang=ja
            export type MessageContentType = TextMessageContentType     // "text"     テキスト  全バージョンで対応
                | LocationMessageContentType // "location" 位置情報  全バージョンで対応
                | StickerMessageContentType  // "sticker"  スタンプ  v2.3 以降で対応
                | ImageMessageContentType    // "image"    画像      v2.3 以降で対応
                | FileMessageContentType;    // "file"     ファイル  v2.9 以降で対応
            export interface Message extends Event {
                type: MessageType;                  // 固定:"message"
                source: {                           // メッセージ送信者の情報
                    userId: string;                 // 送信元メンバーアカウント
                    channelId?: string;             // 送信したトークルーム ID
                    domainId: number;               // 送信したドメイン ID
                };
                content: {                          // メッセージの内容
                    type: MessageContentType;       // "text", "location", "sticker", "image", "file"
                };
            }
            export type TextMessageContentType = 'text';
            export interface TextMessage extends Message {
                content: {
                    type: TextMessageContentType;       // 固定:"text"
                    text: string;                       // メッセージ本文
                    postback?: string;                  // postback メッセージ (ボタンなどのテンプレート利用時)
                }
            }
            export type LocationMessageContentType = 'location';
            export interface LocationMessage extends Message {
                content: {                              // メッセージの内容
                    type: LocationMessageContentType;   // 固定:"location"
                    address: string;                    // メンバーが送信した位置情報(住所)
                    latitude: number;                   // メンバーが送信した位置情報(緯度)
                    longitude: number;                  // メンバーが送信した位置情報(経度)
                }
            }
            export type StickerMessageContentType = 'sticker';
            export interface StickerMessage extends Message {
                content: {                              // メッセージの内容
                    type: StickerMessageContentType;    // 固定:"sticker"
                    packageId: string;                  // パッケージ ID
                    stickerId: string;                  // スタンプ ID
                }
            }
            export type ImageMessageContentType = 'image';
            export interface ImageMessage extends Message {
                content: {                              // メッセージの内容
                    type: ImageMessageContentType;      // 固定:"image"
                    fileId: string;                     // リソース ID
                }
            }
            export type FileMessageContentType = 'file';
            export interface FileMessage extends Message {
                content: {                              // メッセージの内容
                    type: FileMessageContentType;       // 固定:"file"
                    fileId: string;                     // リソース ID
                }
            }
        }
    }

    /**
     * ファイルアップロード / ダウンロード
     * https://developers.worksmobile.com/jp/reference/file-upload?lang=ja
     */
    export namespace File {

        export function buildPart(partBoundary: string, filename: string, contentType: string, data: number[], concat = PlatformG.concatMultipart) {
            const partHeader = [
                `--${partBoundary}`,
                `Content-Disposition: form-data; name="Filedata"; filename="${filename}"`,
                `Content-Type: ${contentType}`,
                '',
                '',
            ];
            const partFooter = [
                '',
                `--${partBoundary}--`,
                ''
            ];
            const multipart = concat(partHeader, data, partFooter);
            return multipart;
        }

        export function buildFetchOptions(partBoundary: string, multipart: number[], accessToken: string): FetchOptions {
            return {
                method: 'post',
                contentType: `multipart/form-data; boundary=${partBoundary}`,
                headers: {
                    //Authorization: 'Bearer ...',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: multipart,
            };

        }
        export interface FetchOptions {
            method: postMethod;
            contentType: string,
            headers: {
                Authorization: string,
            },
            body: content,

        }
        export type postMethod = 'post';
        export type content = number[];

        export function upload(uploadUrl: string, data: number[], contentType: string, filename: string, accessToken: string, concat = PlatformG.concatMultipart, fetch = PlatformG.fetch) {
            // 参考: https://www.labnol.org/code/20096-upload-files-multipart-post
            const partBoundary = '--------------u1p2l3o4a5d6f7i8l9e0d1a2t3a';
            const multipart = buildPart(partBoundary, filename, contentType, data, concat);
            const options = buildFetchOptions(partBoundary, multipart, accessToken);
            const response = fetch(uploadUrl, options);
            const content = JSON.parse(response.contentText as string);
            return content;
        }

    }
}

export default Lineworks;