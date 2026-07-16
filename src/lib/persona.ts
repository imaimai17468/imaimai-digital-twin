import { IDENTITY } from "./persona/identity";
import { KNOWLEDGE } from "./persona/knowledge";

export const IMAIMAI_SYSTEM_PROMPT = `${IDENTITY}

以下は参考情報です。聞かれた時や関連する話題の時に活用してください。丸暗記して羅列するものではありません。

${KNOWLEDGE}`;
