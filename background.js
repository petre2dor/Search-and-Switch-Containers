const tempContextName = 'temp';
var tempContext;

createTempContextIfNotExist();
console.log('tempContext finale', tempContext);

async function findContextByName(name, returnFirst = true){
  const contexts = await browser.contextualIdentities.query({});
  contexts.push({
    cookieStoreId: 'firefox-default',
    name: 'default'
  });
  let results = [];
  
  for (let context of contexts) {
    if (context.name.toLowerCase().indexOf(name.toLowerCase()) > -1) {
      if(returnFirst){
        return context;
      }
      results.push({
        content: context.name,
        description: `Switch to container: ${context.name}`
      })
    }
  }

  return (results != []) ? results : faslse;
}

async function createTempContextIfNotExist(){
  tempContext = await findContextByName(tempContextName);
  console.log('tempContext createifnot', tempContext);
  
  if (!tempContext){
    tempContext = await createTempContext();
  }
}

function createTempContext() {
  return browser.contextualIdentities.create({
    name: "temp",
    color: "purple",
    icon: "briefcase"
  })
}


browser.omnibox.setDefaultSuggestion({
  description: `Search for containers and switch to them (e.g. "co personal" or "co banking")`
});

browser.omnibox.onInputChanged.addListener(async (text, addSuggestions) => {
  const contexts = await browser.contextualIdentities.query({});
  
  let results = await findContextByName(text, false)
  addSuggestions(results);
});

browser.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const tabs = await browser.tabs.query({ currentWindow: true, active: true });

  let context = await findContextByName(text);
  if(context){
    let tabCreateProperties = {
      cookieStoreId: context.cookieStoreId,
      index: tabs[0].index
    };
   
    if (tabs[0].url !== 'about:newtab') {
      tabCreateProperties.url = tabs[0].url;
    }
    browser.tabs.create(tabCreateProperties);
    browser.tabs.remove(tabs[0].id);
  }
});
