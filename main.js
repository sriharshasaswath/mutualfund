// Moralis.initialize("m28EFyQ5YRko8IwmrNJsJLdX0Gc2kdUxwWK6skxj"); // Application id from moralis.io
// Moralis.serverURL = "https://xlri3bfwhifk.usemoralis.com:2053/server"
Moralis.initialize("001"); // Application id from moralis.io
Moralis.serverURL = "http://18.141.210.130:1337/server"

let currentTrade = {};
let currentSelectSide;
let tokens;
let myObj;
let MATIC = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
let USDC  = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'
let USDT  = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'
let DAI   = '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'

const fund = new Map([
    ['FTM','0xb85517b87bf64942adf3a0b9e4c71e4bc5caa4e5'],
    ['ONE','0x80c0cbdb8d0b190238795d376f0bd57fd40525f2'],
    ['ATOM','0xac51C4c48Dc3116487eD4BC16542e27B5694Da1b'],
    ['NEAR','0x72bd80445b0db58ebe3e8db056529d4c5faf6f2f'],
  ]);

async function init(){
    await Moralis.initPlugins();
    // await Moralis.enable();
    await Moralis.enableWeb3();
    await listAvailableTokens();
    currentUser = Moralis.User.current();
    if(currentUser){
        document.getElementById("swap_button").disabled = false;
    }
}

async function listAvailableTokens(){
    const result = await Moralis.Plugins.oneInch.getSupportedTokens({
        chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
      });
    tokens = result.tokens;
    let parent = document.getElementById("token_list");
    for( const address in tokens){
        if (address == MATIC || address == USDC || address == USDT || address == DAI) {
            let token = tokens[address];
            console.log ("Successful ✅");
            // console.log (address);
            let div = document.createElement("div");
            div.setAttribute("data-address", address)
            div.className = "token_row";
            let html = `
            <img class="token_list_img" src="${token.logoURI}">
            <span class="token_list_text">${token.symbol}</span>
            `
            div.innerHTML = html;
            div.onclick = (() => {selectToken(address)});
            parent.appendChild(div);
        }
    }
}

function selectToken(address){
    closeModal();
    document.getElementById("test").innerHTML = JSON.stringify(tokens[address]);
    // console.log(tokens);
    currentTrade[currentSelectSide] = tokens[address];
    myObj = {"currentTrade": currentTrade};
    console.log(myObj);
    // console.log(currentTrade[currentSelectSide]);
    // console.log("currentTrade:" currentTrade);
    renderInterface();
    getQuote();
}

function renderInterface(){
    if(currentTrade.from){
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
    }
    if(currentTrade.to){
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    }
}


async function login() {
    try {
        currentUser = Moralis.User.current();
        if(!currentUser){
            currentUser = await Moralis.Web3.authenticate();
        }
        document.getElementById("swap_button").disabled = false;
    } catch (error) {
        console.log(error);
    }
}

function openModal(side){
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block";
}
function closeModal(){
    document.getElementById("token_modal").style.display = "none";
}

async function getQuote(){
    if(!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;
    
    let amount = Number( 
        document.getElementById("from_amount").value * 10**currentTrade.from.decimals 
    )

    const quote = await Moralis.Plugins.oneInch.quote({
        chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: currentTrade.from.address, // The token you want to swap
        toTokenAddress: currentTrade.to.address, // The token you want to receive
        amount: amount,
    })
    console.log(quote);
    document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
    document.getElementById("to_amount").value = quote.toTokenAmount / (10**quote.toToken.decimals)
}

async function trySwap(){
    let address = Moralis.User.current().get("ethAddress");
    let amount = Number( 
        document.getElementById("from_amount").value * 10**currentTrade.from.decimals 
    )
    // if(currentTrade.from.symbol !== "ETH"){
    if(currentTrade.from.symbol !== "MATIC"){
        const allowance = await Moralis.Plugins.oneInch.hasAllowance({
            chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
            fromTokenAddress: currentTrade.from.address, // The token you want to swap
            fromAddress: address, // Your wallet address
            amount: amount,
        })
        console.log(allowance);
        if(!allowance){
            await Moralis.Plugins.oneInch.approve({
                chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
                tokenAddress: currentTrade.from.address, // The token you want to swap
                fromAddress: address, // Your wallet address
              });
        }
    }
    try {
        // alert(JSON.stringify(receipt1)); 
        let trade = currentTrade.from.address;
        let token = "";
        // amount for each transaction = enter amount / fund size
        // e.g. 25 USDC = 100 USDC / 4 ( FAON )
        alert("Please confirm " + fund.size + " transactions using your metamask wallet.");
        fund.forEach (async function(value, key) {
            var receipt = await doSwap1(trade, address, amount/fund.size, value);
            token += key + ' = ' + value + "<br />";
        })
        document.getElementById("result").innerHTML = token
        alert("Investment / transaction started verify using Polygon Scan: https://polygonscan.com/tokentxns?a=" + address );
    
    } catch (error) {
        console.log(error);
    }

}

async function doSwap1(trade, userAddress, amount, toaddress){
    return Moralis.Plugins.oneInch.swap({
        chain: 'polygon', // The blockchain you want to use (eth/bsc/polygon)
        fromTokenAddress: trade, // The token you want to swap
        toTokenAddress: toaddress, // The token you want to receive
        amount: amount,
        fromAddress: userAddress, // Your wallet address
        slippage: 1,
      });
}

async function logOut() {
    await Moralis.User.logOut();
    console.log("logged out");
}

init();

document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_token_select").onclick = (() => {openModal("from")});
// document.getElementById("to_token_select").onclick = (() => {openModal("to")});
document.getElementById("login_button").onclick = login;
// document.getElementById("from_amount").onblur = getQuote;
document.getElementById("swap_button").onclick = trySwap;
document.getElementById("btn-logout").onclick = logOut;
