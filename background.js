const tempContextName = 'temp'
var tabs = []
var tempContext
var isTempContextClean = false

browser.tabs.onRemoved.addListener(handleRemoved)

function onError(error) {
    console.log(`Error: ${error}`)
}

function maybeResetTempContext(tabs, removedTabId) {
    // if there at least one tab in the the temp context, it's not clean any more
    if (tabs.length > 0) {
        isTempContextClean = false
    }

    // if there were no tabs in temp context, there is no need to reset
    if (isTempContextClean){
        return;
    }

     //if there are no tabs left in temp container
     //  OR (there's only one tab in the temp context AND it's the tab we just closed)
    if (tabs.length == 0 || (tabs.length == 1 && tabs[0].id == removedTabId)) {
        // time to reset
        resetTempContext()
    }
}

function resetTempContext(tabs) {
    console.log('remove context: ', tempContext.cookieStoreId)

    browser
        .contextualIdentities
        .remove(tempContext.cookieStoreId)
        .then(async oldTempContext => {
                console.log('Create new temp context')
                tempContext = await createTempContext()
                isTempContextClean = true
        }, onError)
}

function handleRemoved(tabId, removeInfo) {
    console.log("Tab: " + tabId + " is closing")
    setTimeout(() => {
        browser
        .tabs
        .query({ 'cookieStoreId': tempContext.cookieStoreId })
        .then(tabs => maybeResetTempContext(tabs, tabId), onError)
    }, 100)
}

createTempContextIfNotExist()
console.log('tempContext finale', tempContext)

async function createTempContextIfNotExist() {
    tempContext = await findContextByName(tempContextName)
    console.log('tempContext createIfNot', tempContext)

    if (!tempContext) {
        tempContext = await createTempContext()
        console.log('created new tempContext: ', tempContext)
    }
}

function createTempContext() {
    return browser
        .contextualIdentities
        .create({
        name: "temp",
        color: "purple",
        icon: "briefcase"
        })
}

async function findContextByName(name) {
    const contexts = await browser.contextualIdentities.query({})
    for (let context of contexts) {
        if (context.name.toLowerCase().indexOf(name.toLowerCase()) > -1) {
            return context
        }
    }

    return false
}

async function getSuggestions(name) {
    const contexts = await browser.contextualIdentities.query({})
    contexts.push({
        cookieStoreId: 'firefox-default',
        name: 'default'
    })
    let results = []

    for (let context of contexts) {
        if (context.name.toLowerCase().indexOf(name.toLowerCase()) > -1) {
            results.push({
                content: context.name,
                description: `Switch to container: ${context.name}`
            })
        }
    }

    return results;
}

browser.omnibox.setDefaultSuggestion({
    description: `Search for containers and switch to them (e.g. "co personal" or "co banking")`
})

browser.omnibox.onInputChanged.addListener(async (text, addSuggestions) => {
    // const contexts = await browser.contextualIdentities.query({})

    let suggestions = await getSuggestions(text)
    addSuggestions(suggestions)
})

browser.omnibox.onInputEntered.addListener(async (text, disposition) => {
    const activeTab = await browser
                                .tabs
                                .query({ currentWindow: true, active: true })
                                .then(
                                    tabs => { return tabs[0] }
                                )

    let context = await findContextByName(text)
    if (context) {
        let tabCreateProperties = {
            cookieStoreId: context.cookieStoreId,
            index: activeTab.index
        }

        if (activeTab.url !== 'about:newtab') {
            tabCreateProperties.url = activeTab.url
        }
        browser.tabs.create(tabCreateProperties)
        browser.tabs.remove(activeTab.id)
    }
})
