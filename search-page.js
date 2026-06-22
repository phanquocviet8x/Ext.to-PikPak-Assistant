let started = false;
waitForResults();

function waitForResults() {

    const observer =
        new MutationObserver(() => {

            if (started) {
                return;
            }
            started = true;

            const links =
                document.querySelectorAll(
                    "a.torrent-title-link"
                );

            if (
                links.length === 0
            ) {
                return;
            }

            observer.disconnect();

            startParse();
        });

    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );
}

async function startParse() {

    const table =
        document.querySelector(
            ".search-table"
        );
    const headerRow =
        table.querySelector(
            "thead tr"
        );
    headerRow.insertAdjacentHTML(
        "beforeend",
        `
    <th>COPY</th>
    <th>PIKPAK</th>
`
    );

    const rows =
        [
            ...document.querySelectorAll(
                ".search-table tbody tr"
            )
        ];

    for (const row of rows) {
        row.insertAdjacentHTML(
            "beforeend",
            `
        <td class="ext-copy"></td>
        <td class="ext-pikpak"></td>
    `
        );
    }

    const settings =
        await chrome.storage.local.get(
            {
                concurrent: 1
            }
        );

    const concurrent =
        settings.concurrent;

    await processRows(
        rows,
        concurrent
    );
}


async function processRows(
    rows,
    concurrent = 1
) {

    let index = 0;

    async function worker(workerId) {
        while (true) {

            const current = index++;

            if (
                current >= rows.length
            ) {
                break;
            }

            await processTorrent(
                rows[current],
                workerId
            );
        }
    }

    const workers =
        Array.from(
            {
                length:
                    concurrent
            },
            // worker
            (_, i) => worker(i + 1)
        );

    await Promise.all(
        workers
    );
}

async function processTorrent(
    row, workerId
) {

    const url = 'https://ext.to' + row.querySelector("a.torrent-title-link").getAttribute('href');

    try {
        const response =
            await fetch(
                url
            );

        const html =
            await response.text();

        const info =
            parseTorrentPage(html);


        const magnetResult = await getMagnet(info);

        if (
            magnetResult.success
        ) {

            const pikpak =
                await checkPikPak(
                    magnetResult.magnet
                );

            updateRow(row, magnetResult.magnet, pikpak.status)
        } else {
            // TODO
        }

    }
    catch (
    ex
    ) {

        console.error(
            ex
        );
    }
}

function updateRow(
    row,
    magnet,
    pikpakStatus
) {

    const copyCell =
        row.querySelector(
            ".ext-copy"
        );

    const pikpakCell =
        row.querySelector(
            ".ext-pikpak"
        );

    copyCell.innerHTML =
        `
        <button style="opacity: 1;" role="button" href="javascript:void(0);" rel="nofollow" class="btn btn-primary detail-download-link copy-magnet-btn">
                 <i class="fa fa-copy" aria-hidden="true"></i>
        </button>
    `;
 
    const copyBtn =
        copyCell.querySelector(
            ".copy-magnet-btn"
        );


    copyBtn.onclick =
        function (e) {
            e.preventDefault();
            e.stopPropagation();

            copyToClipboardLegacy(
                magnet,
                this
            );
        };
 
    const color =
        pikpakStatus === "OK"
            ? "#00c853"
            : "#ff5252";

    pikpakCell.innerHTML =
        `
<button role="button" href="javascript:void(0);" rel="nofollow" class="ext-btn-pikpak"
    style="
        background:${color};
        color:white;
        border:none;
        padding:4px 8px;
        border-radius:4px;
        cursor:pointer;
    ">
    ${pikpakStatus}
</button>
`;

    const pikpakBtn =
        pikpakCell.querySelector(
            "button"
        );

    pikpakBtn.onclick =
        function (e) {
            e.preventDefault();
            e.stopPropagation();

            const url =
                "https://mypikpak.com/drive/all"
                + "?action=create_task"
                + "&launcher=url_checker"
                + "&scene=official_website"
                + "&url="
                + encodeURIComponent(
                    magnet
                );

            window.open(
                url,
                "_blank"
            );
        };
}


function copyToClipboardLegacy(text, btn) {
    var isIOS = /ipad|iphone|ipod/.test(navigator.userAgent.toLowerCase());

    var tempInput = document.createElement(isIOS ? 'input' : 'textarea');
    tempInput.value = text;

    tempInput.style.position = 'absolute';
    tempInput.style.left = '0';
    tempInput.style.top = '0';
    tempInput.style.opacity = '0';
    tempInput.style.zIndex = '-100';
    tempInput.style.fontSize = '12pt';

    if (isIOS) {
        tempInput.setAttribute('readonly', 'readonly');
        tempInput.setAttribute('contenteditable', 'true');
    }

    document.body.appendChild(tempInput);

    var successful = false;

    if (isIOS) {
        var oldContentEditable = tempInput.contentEditable;
        var oldReadOnly = tempInput.readOnly;

        tempInput.contentEditable = 'true';
        tempInput.readOnly = false;

        var range = document.createRange();
        range.selectNodeContents(tempInput);

        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        tempInput.setSelectionRange(0, 999999);

        tempInput.contentEditable = oldContentEditable;
        tempInput.readOnly = oldReadOnly;

        successful = document.execCommand('copy');

    } else {
        tempInput.focus();
        tempInput.select();

        try {
            successful = document.execCommand('copy');
        } catch (err) {
            successful = false;
        }
    }

    document.body.removeChild(tempInput);
}

function parseTorrentPage(html) {

    const torrentId =
        html.match(
            /data-id="(\d+)"/
        )?.[1];

    const pageToken =
        html.match(
            /window\.pageToken\s*=\s*['"]([^'"]+)['"]/
        )?.[1];

    const sessid =
        html.match(
            /window\.(?:csrfToken|sessid)\s*=\s*['"]([^'"]+)['"]/
        )?.[1];

    return {
        torrentId,
        pageToken,
        sessid
    };
}

async function computeHMAC(
    torrentId,
    timestamp,
    token
) {

    const data =
        `${torrentId}|${timestamp}|${token}`;

    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder()
                .encode(data)
        );

    return [...new Uint8Array(hashBuffer)]
        .map(
            b =>
                b.toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join("");
}

async function getMagnet(info) {

    const timestamp =
        Math.floor(
            Date.now() / 1000
        );

    const hmac =
        await computeHMAC(
            info.torrentId,
            timestamp,
            info.pageToken
        );

    const form =
        new URLSearchParams();

    form.set(
        "torrent_id",
        info.torrentId
    );

    form.set(
        "action",
        // "get_hash"
        "get_magnet"
    );

    form.set(
        "timestamp",
        timestamp
    );

    form.set(
        "hmac",
        hmac
    );

    form.set(
        "sessid",
        info.sessid
    );

    const response =
        await fetch(
            "https://ext.to/ajax/getTorrentMagnet.php",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded; charset=UTF-8"
                },

                body:
                    form.toString()
            }
        );

    const json =
        await response.json();

    return json;
}

async function checkPikPak(
    magnetUrl
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            chrome.runtime.sendMessage(
                {
                    action:
                        "checkPikPak",

                    magnet:
                        magnetUrl
                },
                result => {

                    if (
                        chrome.runtime.lastError
                    ) {

                        reject(
                            chrome.runtime.lastError
                        );

                        return;
                    }

                    resolve(
                        result
                    );
                }
            );

        }
    );
}
