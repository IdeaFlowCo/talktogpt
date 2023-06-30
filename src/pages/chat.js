import React from "react";
import Meta from "components/Meta";
import StreamingChat from "../components/chat/StreamingChat";
import WhisperTest from "../components/chat/WhisperTest";
import { requireAuth } from "../util/auth";
function ChatPage(props) {
    return (
        <>
            <Meta title="Chat" description="Chat with GPT" />
            {/* <StreamingChat /> */}
            <WhisperTest />
        </>
    );
}

export default requireAuth(ChatPage);
