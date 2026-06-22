chrome.runtime.onMessage.addListener(
    (
        msg,
        sender,
        sendResponse
    ) => {

        if (
            msg.action !==
            "checkPikPak"
        ) {
            return;
        }

        (async () => {

            try {

                const response =
                    await fetch(
                        "https://api-drive.mypikpak.com/drive/v1/resource/status?url="
                        +
                        encodeURIComponent(
                            msg.magnet
                        )
                    );

                const json =
                    await response.json();

                sendResponse(
                    json
                );
            }
            catch (
            ex
            ) {

                sendResponse(
                    {
                        error:
                            ex.message
                    }
                );
            }

        })();

        return true;
    }
);