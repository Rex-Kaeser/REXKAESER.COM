var currentConnectionID = 0;
function clearConsole(){
    document.getElementById("console").innerHTML = "";
}
function logConsoleText(text, color){
    var line = document.createElement("p");
    line.setAttribute("class", "align-left analog-font text-lg text-" + color);
    line.innerHTML = text;
    document.getElementById("console").appendChild(line);
}
function logConsoleBreak(){
    var line = document.createElement("br");
    document.getElementById("console").appendChild(line);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
  
var socket;
function openConnection(debug){
    var thisConnectionID = -1;
    if (debug){
        currentConnectionID++;
        thisConnectionID = currentConnectionID;
        clearConsole();
    }
    return new Promise(async function(resolve) {
        if (localStorage.getItem("address") != null && localStorage.getItem("key") != null){
            if (currentConnectionID == thisConnectionID){
                logConsoleText("Attempt connect to " + localStorage.getItem("address"), "white");
                logConsoleBreak();
            }
            const address = "ws://" + localStorage.getItem("address") + "/websocket/";
            socket = new WebSocket(address);


            var valid = false;
            // Connection opened
            socket.onopen = function(event) {
                if (currentConnectionID == thisConnectionID)
                    logConsoleText("Connected to websocket", "emerald-500");
                socket.send(AESEncrypt(localStorage.getItem("key"), "authenticate"));
                if (currentConnectionID == thisConnectionID)
                    logConsoleText("Sending Authentication Key", "gray-500");
            };
            
            
            // Listen for messages
            socket.onmessage = function(event) {
                if (AESDecrypt(localStorage.getItem("key"), event.data).toString(CryptoJS.enc.Utf8) == "authenticated"){
                    valid = true;
                    
                }
            };
    
            socket.onclose = function(event) {
                if (!valid){
                    resolve(null);
                }
            };
    
            sleep(5000).then(() => { if (!valid) {socket.close();} });
        }else{
            console.log("Encryption Service Initialized")
            if (currentConnectionID == thisConnectionID)
                logConsoleText("Invalid Credentials", "white");
        }
        
    });
    
}

function update(){
    document.getElementById("confirm").setAttribute("class", "hidden");
    localStorage.setItem("address", document.getElementById("address").value);
    localStorage.setItem("key", document.getElementById("key").value);

    if (openConnection(true) != null){
        document.getElementById("confirm").setAttribute("class", "");
    }
    // Create WebSocket connection.
    

}

function startSetup(){
    clearConsole();
    logConsoleText("Loading Default Values...", "yellow");
    var address = localStorage.getItem("address");
    var key = localStorage.getItem("key");
    if (address == null){
        address = "localhost:8080";
    }
    if (key == null){
        key = "default";
    }
    document.getElementById("address").value = address;
    document.getElementById("key").value = key;
    update();
}
