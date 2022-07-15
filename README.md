# lineworks-api20-for-gas

# 開発環境の準備

## インストール

- git
- Docker
- [VS Code](https://code.visualstudio.com/download)
- [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

## クローンとVS Codeの起動

1. `git clone https://github.com/jp-rad/lineworks-api20-for-gas.git`
1. `lineworks-api20-for-gas`フォルダをVS Codeで開く
1. Dockerを起動する
1. VS Codeで`Reopen in Container`を実行し、Dockerコンテナーを起動する  
（初回、ダウンロードとインストールが行われるので、待つ）

## Google Apps Script の追加

[Google ドライブ](https://drive.google.com/drive/my-drive)を開き、`Google Apps Script`を追加します。

1. [Google ドライブ](https://drive.google.com/drive/my-drive)
1. `新規` > `その他` > `Google Apps Script`
1. `プロジェクトの設定`で、`スクリプト ID`をコピーする

## GASログインとGASクローン

1. VS Codeのメニュー `ターミナル` > `タスクの実行`で、`GAS ログイン`を選択する
1. VS Codeのメニュー `ターミナル` > `タスクの実行`で、`GAS クローン`を選択する
1. コピーした`スクリプト ID`の値を「スクリプト ID」欄に貼り付け、Enterキーを押下する
1. VS Codeのメニュー `ターミナル` > `タスクの実行`で、`GAS ビルドとプッシュ`を選択する

`Google Apps Script`を開くと、ローカルのソースコードが反映されていることを確認できます(洗い替え)。

# LINE WORKSのBotとアプリ

- [LINE WORKS](https://line.worksmobile.com/jp/)
- [LINE WORKS Admin](https://common.worksmobile.com/p/admin)
- [LINE WORKS Developer Console](https://developers.worksmobile.com/jp/?lang=ja)

## Botの登録

[LINE WORKS Developer Console](https://developers.worksmobile.com/jp/?lang=ja)を開き、`Bot`を`登録`します。

|#|項目|内容|説明|
|---|---|---|---|
|1|「プロフィール画像」|(任意)|お好みのBotの画像|
|2|Bot名|テストBot|Botの表示名|
|3|「説明」|Google Apps Script 連携テスト|Botの説明|
|4|Bot ID|(自動生成)| |
|5|API Interface|API 2.0|APIの新旧バージョン|
|6|固定メニュー|(そのまま)||
|7|Callback URL|Off|(後でOnに変更)|
|8|Botポリシー|(チェック)複数人のトークルームに招待可||
|9|主担当|(最高管理者のユーザー)||
|10|副担当|(副管理者のユーザー)||

`保存`するとBotが登録され、ID(Bot ID)を確認することができます(7桁の数字)。

## Botの有効化

[LINE WORKS Admin](https://common.worksmobile.com/p/admin)を開き、サイドメニューの`サービス` > `Bot`で、`Bot追加`します。

追加したBotを選択し、`修正`ボタンで編集モードにし、`公開設定`をオンにし、`非公開`から`公開`へと修正し、`保存`します。

## トークのグループ作成とBot招待

[LINE WORKS](https://line.worksmobile.com/jp/)のトークを開き、`トークルームの作成`で`グループ`を追加します。

`トークルームID`を調べるために、追加したグループでテスト的なメッセージを入力し、送信を行います。

追加したトーク内の右上のメニュー（`・・・`）から`Bot招待`を選択し、グループへBotを招待（追加）します。

[LINE WORKS Admin](https://common.worksmobile.com/p/admin)を開き、サイドメニューの`監査` > `トーク`で、`検索`すると、送信したトークの`トークルームID`を確認することができます(9桁の数字)。

## アプリの追加

[LINE WORKS Developer Console](https://developers.worksmobile.com/jp/?lang=ja)を開き、サイドメニューの`API 2.0`で、`アプリの新規追加`を行います。

|#|項目|内容|説明|
|---|---|---|---|
|1|アプリ名|(ユニークな名前)|組織内で重複しないアプリ名|
|2|アプリの説明|(アプリの説明)||
|3|Client ID|(自動生成)||
|4|Client Secret|(自動生成)||
|5|Redirect URL|(空欄)||
|6|OAuth Scopes|(すべて選択)|`管理`ですべてを選択|

## 構成ファイルの追加

`src`フォルダに`private_lineworks.config.json.html`ファイルを新規作成します。

`cp sample.private_lineworks.config.json.html ./src/private_lineworks.config.json.html`


```
{
    "apps": [
        {
            "label": "Bot Test",
            "description": "Google Apps Script",
            "clientId": "",
            "clientSecret": "",
            "serviceAccount": "",
            "privateKeyFilename": "",
            "userOption": {
                "botId": "",
                "LineworksTest": {
                    "botId": "",
                    "channelId": "",
                    "userId": ""
                }
            }
        }
    ],
    "defaultAppLabel": "Bot Test"
}
```

`./src/private_lineworks.config.json.html`ファイルの値を設定します。

|#|項目|内容|説明|
|---|---|---|---|
|1|apps[].clientId|API2.0アプリのClient ID|コピー|
|2|apps[].clientSecret|API2.0アプリのClient Secret|コピー|
|3|apps[].serviceAccount|API2.0アプリのService Account|発行後、コピー|
|4|apps[].privateKeyFilename|API2.0アプリのPrivate Keyで発行したファイル名|発行/再発行でダウンロード|
|5|apps[].userOption.botId|Bot ID|Bot登録時に確認したBot ID(7桁の数字)|
|6|apps[].userOption.LineworksTest.botId|Bot ID|Bot登録時に確認したBot ID(7桁の数字)|
|7|apps[].userOption.LineworksTest.channelId|トークルームID|監査で確認したトークルームID(9桁の数字)|
|8|apps[].userOption.LineworksTest.userId|ユーザーID|メンバー情報で確認できるメンバーのID(id@group形式等)|

Private Keyの発行/再発行でダウンロードしたファイルの名前の拡張子を`.html`に変更(追加)して、`src`フォルダに保存します。

例： `private_20220505001234.key.html`

**【注意】**

`private_lineworks.config.json.html`ファイルと`private_20220505001234.key.html`ファイルは公開しないでください。

## テスト実行

1. VS Codeのメニュー `ターミナル` > `タスクの実行`で、`GAS ビルドとプッシュ`を選択する
1. `Google Apps Script`を開き、ローカルのソースコードが反映されていることを確認する（リロード）
1. `Google Apps Script`で、`Lineworks.test.gs`ファイルを選択し、実行する関数を選んで、`実行`または`デバッグ`を行う
1. [LINE WORKS](https://line.worksmobile.com/jp/)のトークにメッセージが送信されていることを確認する

初回実行時には、`承認`が求められるので、許可します。

# トークBot

`https.ts(gs)`の`doPost`メソッドがBotのCallback(URL)として呼び出されるように設定します。

これにより、`https.ts(gs)`がBotサーバーとなり、LINE WORKSのトークBotが機能します。

- [メッセージ(Callback) 受信](https://developers.worksmobile.com/jp/reference/bot-callback?lang=ja)

## ウェブアプリのデプロイ

`Google Apps Script`で、Botサーバーとなる`ウェブアプリ`をデプロイします。

1. `Google Apps Script`を開き、`デプロイ`から`新しいデプロイ`を選択する
1. `ウェブアプリ`を選択し、`デプロイ`する  
次のユーザーとして実行:「自分（your.account@example.com）」  
アクセスできるユーザー:「全員」  
1. ウェブアプリ urlをコピーする（BotのCallback URLとする）

## BotのCallback有効化

[LINE WORKS Developer Console](https://developers.worksmobile.com/jp/?lang=ja)を開き、登録済みの`Bot`を`修正`します。

|#|項目|内容|説明|
|---|---|---|---|
|1|Callback URL|On||
|2|(URL)       |(コピーしたウェブアプリ url)||
|3|(チェックボックス)|（すべて選択）|メンバーが送信可能なメッセージタイプ|

## 動作確認

トークグループで、メッセージやスタンプの送信をすると、Botから自動メッセージが返信されます。
