import Lineworks from "../src/Lineworks";

// トーク共通プロパティ
// https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
describe("トーク共通プロパティ (Lineworks.Bot.Content)", () => {
  beforeAll(() => {
    Logger.log = jest.fn().mockImplementation(msg => {
      return console.log(msg);
    });
    jest.spyOn(Logger, "log");
  });

  //https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
  test("bot-send-content: quick reply structure", () => {
    const expected: Lineworks.Bot.Content.quickReply = {
      "items": [
        {
          "imageUrl": "https://www.example.com/a.png",
          "action": {
            "type": "message",
            "label": "Send message",
            "text": "send message"
          }
        },
        {
          "action": {
            "type": "camera",
            "label": "Open camera"
          }
        }
      ]
    };
    const actual = Lineworks.Bot.Content.quickReply([
      Lineworks.Bot.Content.quickReplyItem(
        Lineworks.Bot.Action.Message("Send message", "send message"),
        'https://www.example.com/a.png'
      ),
      Lineworks.Bot.Content.quickReplyItem(
        Lineworks.Bot.Action.Camera("Open camera"),
      ),
    ]);
    expect(actual).toEqual(expected);
  });

  //https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
  test("bot-send-content: text with quick reply", () => {
    const expected: Lineworks.Bot.Content.Text = {
      "content": {
        "type": "text",
        "text": "Please select your favorite food category!",
        "quickReply": {
          "items": [
            {
              "imageUrl": "https://www.example.com/a.png",
              "action": {
                "type": "message",
                "label": "Sushi",
                "text": "Sushi"
              }
            },
            {
              "imageUrl": "https://www.example.com/b.png",
              "action": {
                "type": "message",
                "label": "Italian",
                "text": "Italian"
              }
            },
            {
              "action": {
                "type": "camera",
                "label": "Open Camera"
              }
            }
          ]
        }
      }
    };
    const text = 'Please select your favorite food category!';
    const quickReply = Lineworks.Bot.Content.quickReply([
      Lineworks.Bot.Content.quickReplyItem(
        Lineworks.Bot.Action.Message('Sushi', 'Sushi'),
        'https://www.example.com/a.png',
      ),
      Lineworks.Bot.Content.quickReplyItem(
        Lineworks.Bot.Action.Message('Italian', 'Italian'),
        'https://www.example.com/b.png',
      ),
      Lineworks.Bot.Content.quickReplyItem(
        Lineworks.Bot.Action.Camera("Open Camera"),
      ),
    ]);
    const actual = Lineworks.Bot.Content.Text(text, undefined, quickReply);
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
  test("bot-send-content: Text タイプ", () => {
    const expected: Lineworks.Bot.Content.Text = {
      "content": {
        "type": "text",
        "text": "Hello, <m userId=\"admin@example.com\">"
      }
    };
    const mAdmin = Lineworks.Bot.Content.mention('admin@example.com');
    const text = `Hello, ${mAdmin}`;
    const actual = Lineworks.Bot.Content.Text(text);
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
  test("bot-send-content: Link タイプ", () => {
    const expected: Lineworks.Bot.Content.Link = {
      "content": {
        "type": "link",
        "contentText": "<m userId=\"admin@example.com\">, please refer to the link.",
        "linkText": "link text",
        "link": "http://www.worksmobile.com"
      }
    };
    const mAdmin = Lineworks.Bot.Content.mention('admin@example.com');
    const contentText = `${mAdmin}, please refer to the link.`;
    const actual = Lineworks.Bot.Content.Link(contentText, 'link text', 'http://www.worksmobile.com');
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-content?lang=ja
  test("bot-send-content: Button template タイプ", () => {
    const expected: Lineworks.Bot.Content.ButtonTemplate = {
      "content": {
        "type": "button_template",
        "contentText": "<m userId=\"admin@example.com\">, please refer to the link.",
        "actions": [{
          "type": "uri",
          "label": "WorksMobile Homepage",
          "uri": "https://line.worksmobile.com"
        }, {
          "type": "message",
          "label": "FAQ",
          "postback": "ButtonTemplate_FAQ"
        }]
      }
    };
    const mAdmin = Lineworks.Bot.Content.mention('admin@example.com');
    const contentText = `${mAdmin}, please refer to the link.`;
    const actual = Lineworks.Bot.Content.ButtonTemplate(contentText, [
      Lineworks.Bot.Action.Uri('https://line.worksmobile.com', 'WorksMobile Homepage'),
      Lineworks.Bot.Action.Message('FAQ', undefined, 'ButtonTemplate_FAQ'),
    ]);
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-text?lang=ja
  test("bot-send-text: simple", () => {
    const expected: Lineworks.Bot.Content.Text = {
      "content": {
        "type": "text",
        "text": "hello"
      }
    };
    const text = 'hello';
    const actual = Lineworks.Bot.Content.Text(text);
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-text?lang=ja
  test("bot-send-text: detail", () => {
    const expected: Lineworks.Bot.Content.Text = {
      "content": {
        "type": "text",
        "text": "hello",
        "i18nTexts": [{
          "language": "ja_JP",
          "text": "こんにちは"
        }, {
          "language": "ko_KR",
          "text": "안녕하세요"
        }]
      }
    };
    const text = "hello";
    const i18nTexts = [
      Lineworks.Bot.I18N.i18nText('ja_JP', 'こんにちは'),
      Lineworks.Bot.I18N.i18nText('ko_KR', '안녕하세요'),
    ];
    const actual = Lineworks.Bot.Content.Text(text, i18nTexts);
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-image?lang=ja
  test("bot-send-image: URL 方式", () => {
    const expected: Lineworks.Bot.Content.ImageUrl = {
      "content": {
        "type": "image",
        "previewImageUrl": "https://example.com/preview.png",
        "originalContentUrl": "https://example.com/image.png"
      }
    };
    const actual = Lineworks.Bot.Content.Image('https://example.com/preview.png', 'https://example.com/image.png');
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-image?lang=ja
  test("bot-send-image: ファイル ID 方式", () => {
    const expected: Lineworks.Bot.Content.ImageFileId = {
      "content": {
        "type": "image",
        "fileId": "jp1.1628695315008671000.1628781715.0.1000001.0.0.0"
      }
    };
    const actual = Lineworks.Bot.Content.Image('jp1.1628695315008671000.1628781715.0.1000001.0.0.0');
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-link?lang=ja
  test("bot-send-link: simple", () => {
    const expected: Lineworks.Bot.Content.Link = {
      "content": {
        "type": "link",
        "contentText": "content text",
        "linkText": "link text",
        "link": "http://www.worksmobile.com"
      }
    };
    const contentText = 'content text';
    const linkText = 'link text';
    const link = 'http://www.worksmobile.com';
    const actual = Lineworks.Bot.Content.Link(contentText, linkText, link);
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-link?lang=ja
  test("bot-send-link: detail", () => {
    const expected: Lineworks.Bot.Content.Link = {
      "content": {
        "type": "link",
        "contentText": "content text",
        "i18nContentTexts": [{
          "language": "ja_JP",
          "contentText": "コンテンツテキスト"
        }, {
          "language": "ko_KR",
          "contentText": "컨텐츠 텍스트"
        }],
        "linkText": "link area",
        "i18nLinkTexts": [{
          "language": "ja_JP",
          "linkText": "リンクテキスト"
        }, {
          "language": "ko_KR",
          "linkText": "링크 텍스트"
        }],
        "link": "http://line.worksmobile.com"
      }
    };
    const i18nContentTexts = [
      Lineworks.Bot.I18N.i18nContentText('ja_JP', 'コンテンツテキスト'),
      Lineworks.Bot.I18N.i18nContentText('ko_KR', '컨텐츠 텍스트'),
    ];
    const i18nLinkTexts = [
      Lineworks.Bot.I18N.i18nLinkText('ja_JP', 'リンクテキスト'),
      Lineworks.Bot.I18N.i18nLinkText('ko_KR', '링크 텍스트'),
    ];
    const contentText = 'content text';
    const linkText = 'link area';
    const link = 'http://line.worksmobile.com';
    const actual = Lineworks.Bot.Content.Link(contentText, linkText, link, i18nContentTexts, i18nLinkTexts);
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-sticker?lang=ja
  test("bot-send-sticker: sticker", () => {
    const expected: Lineworks.Bot.Content.Stamp = {
      "content": {
        "type": "sticker",
        "packageId": "1",
        "stickerId": "2"
      }
    };
    const actual = Lineworks.Bot.Content.Stamp('1', '2');
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-button?lang=ja
  test("bot-send-button: button_template", () => {
    const expected: Lineworks.Bot.Content.ButtonTemplate = {
      "content": {
        "type": "button_template",
        "contentText": "What do you want?",
        "actions": [{
          "type": "uri",
          "label": "LINE WORKS Homepage",
          "uri": "https://line.worksmobile.com"
        }, {
          "type": "message",
          "label": "FAQ",
          "postback": "ButtonTemplate_FAQ"
        }]
      }
    };
    const actual = Lineworks.Bot.Content.ButtonTemplate(
      'What do you want?',
      [
        Lineworks.Bot.Action.Uri('https://line.worksmobile.com', 'LINE WORKS Homepage'),
        Lineworks.Bot.Action.Message('FAQ', undefined, 'ButtonTemplate_FAQ'),
      ],
    );
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-list?lang=ja
  test("bot-send-list: list_template", () => {
    const expected: Lineworks.Bot.Content.ListTemplate = {
      "content": {
        "type": "list_template",
        "coverData": {
          "backgroundImageUrl": "https://example.com/1.png"
        },
        "elements": [{
          "title": "LINE WORKS Homepage",
          "subtitle": "Press the button to visit.",
          "action": {
            "type": "uri",
            "label": "Visit",
            "uri": "https://line.worksmobile.com"
          }
        }, {
          "title": "FAQ",
          "subtitle": "Talk with bot.",
          "originalContentUrl": "https://example.com/2.png",
          "action": {
            "type": "message",
            "label": "Talk",
            "postback": "ListTemplate_Talk"
          }
        }],
        "actions": [[{
          "type": "message",
          "label": "View more",
          "postback": "ListTempalte_ViewMore"
        }]]
      }
    };
    const actual = Lineworks.Bot.Content.ListTemplate(
      [
        Lineworks.Bot.Content.element(
          'LINE WORKS Homepage',
          'Press the button to visit.',
          undefined,
          undefined,
          Lineworks.Bot.Action.Uri('https://line.worksmobile.com', 'Visit')
        ),
        Lineworks.Bot.Content.elementUri(
          'https://example.com/2.png',
          'FAQ',
          'Talk with bot.',
          Lineworks.Bot.Action.Message('Talk', undefined, 'ListTemplate_Talk'),
        ),
      ],
      [[
        Lineworks.Bot.Action.Message('View more', undefined, 'ListTempalte_ViewMore'),
      ]],
      Lineworks.Bot.Content.coverDataImageUri('https://example.com/1.png'),
    );
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-file?lang=ja
  test("bot-send-file: URL 方式", () => {
    const expected: Lineworks.Bot.Content.FileUrl = {
      "content": {
        "type": "file",
        "originalContentUrl": "https://line.worksmobile.com/kr/wp-content/uploads/2020/05/user-start-guide-v2.0.pdf"
      }
    };
    const actual = Lineworks.Bot.Content.FileUrl('https://line.worksmobile.com/kr/wp-content/uploads/2020/05/user-start-guide-v2.0.pdf');
    expect(actual).toEqual(expected);
  });

  // https://developers.worksmobile.com/jp/reference/bot-send-file?lang=ja
  test("bot-send-image: ファイル ID 方式", () => {
    const expected: Lineworks.Bot.Content.FileFileId = {
      "content": {
        "type": "file",
        "fileId": "jp1.1628695315008671000.1628781715.0.1000001.0.0.0"
      }
    };
    const actual = Lineworks.Bot.Content.FileId('jp1.1628695315008671000.1628781715.0.1000001.0.0.0');
    expect(actual).toEqual(expected);
  });

});