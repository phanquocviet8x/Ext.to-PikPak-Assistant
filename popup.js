document
    .getElementById("searchBtn")
    .addEventListener("click", () => {

        saveSettings();

        const params =
            new URLSearchParams();

        params.set(
            "sort",
            document.getElementById("sort").value
        );

        params.set(
            "order",
            document.getElementById("order").value
        );

        params.set(
            "user_sort",
            "1"
        );

        params.set(
            "size_from",
            document.getElementById("sizeFrom").value
        );

        params.set(
            "size_from_format",
            "2"
        );

        params.set(
            "size_to",
            document.getElementById("sizeTo").value
        );

        params.set(
            "size_to_format",
            "2"
        );

        params.set(
            "with_adult",
            document.getElementById("adult").checked
                ? "1"
                : "0"
        );

        params.set(
            "q",
            document.getElementById("keyword").value.trim()
        );

        chrome.tabs.create({
            url:
                "https://ext.to/browse/?" + 'cat=1' + '&page_size=25' + '&'
                + params.toString()
        });
    });

document
    .getElementById("keyword")
    .addEventListener("keydown", e => {

        if (e.key === "Enter") {

            document
                .getElementById("searchBtn")
                .click();
        }

    });

function saveSettings() {

    chrome.storage.local.set({
        keyword: document.getElementById("keyword").value,
        sort: document.getElementById("sort").value,
        order: document.getElementById("order").value,
        sizeFrom: document.getElementById("sizeFrom").value,
        sizeTo: document.getElementById("sizeTo").value,
        adult: document.getElementById("adult").checked,
        concurrent: parseInt(document.getElementById("concurrent").value) || 1
    });

}

function loadSettings() {

    chrome.storage.local.get(
        {
            keyword: "",
            sort: "age",
            order: "desc",
            sizeFrom: "1",
            sizeTo: "10",
            adult: true,
            concurrent: 1
        },
        data => {

            document.getElementById("keyword").value =
                data.keyword;

            document.getElementById("sort").value =
                data.sort;

            document.getElementById("order").value =
                data.order;

            document.getElementById("sizeFrom").value =
                data.sizeFrom;

            document.getElementById("sizeTo").value =
                data.sizeTo;

            document.getElementById("adult").checked =
                data.adult;

            document.getElementById("concurrent").value =
                data.concurrent;
        }
    );

}


[
    "keyword",
    "sort",
    "order",
    "sizeFrom",
    "sizeTo",
    "adult",
    "concurrent"
].forEach(id => {

    document
        .getElementById(id)
        .addEventListener(
            "input",
            saveSettings
        );

    document
        .getElementById(id)
        .addEventListener(
            "change",
            saveSettings
        );

});


document.addEventListener(
    "DOMContentLoaded",
    loadSettings
);