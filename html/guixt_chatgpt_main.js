var guixt;

function guixt_initialize(obj) {
    guixt = obj;
};

var OPENAI_API_KEY = "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";
var bTextToSpeechSupported = false;
var bSpeechInProgress = false;
var oSpeechRecognizer = null
var oSpeechSynthesisUtterance = null;
var oVoices = null;

var historyContext = [];


function OnLoad() {
    if ("webkitSpeechRecognition" in window) {
    } else {
        //speech to text not supported
        lblSpeak.style.display = "none";
    }

    if ('speechSynthesis' in window) {
        bTextToSpeechSupported = true;

        speechSynthesis.onvoiceschanged = function () {
            oVoices = window.speechSynthesis.getVoices();
            for (var i = 0; i < oVoices.length; i++) {
                selVoices[selVoices.length] = new Option(oVoices[i].name, i);
            }
        };
    }
}

function ChangeLang(o) {
    if (oSpeechRecognizer) {
        oSpeechRecognizer.lang = selLang.value;
        //SpeechToText()
    }




}
let autoScrollInterval;
function setAutoScroll(e) {
    if (e.checked) {
        // Wenn das Kontrollkästchen aktiviert ist, starten Sie das automatische Scrollen
        var ta = document.getElementById("txtOutput");
        autoScrollInterval = setInterval(() => {
            ta.scrollTop = ta.scrollHeight;
        }, 1000); // Scrollt jede Sekunde
    } else {
        // Wenn das Kontrollkästchen deaktiviert ist, stoppen Sie das automatische Scrollen
        clearInterval(autoScrollInterval);
    }

}
function guixt_get(fieldname) {
    var fieldvalue = guixt.get(fieldname);
    let fieldinfo = {
        "fieldname": fieldname,
        "fieldvalue": fieldvalue

    };
    return JSON.stringify(fieldinfo);
}

function Send() {

    // To save costs. always start without further context
    // historyContext = [];

    var sQuestion = txtMsg.value;
    if (sQuestion == "") {
        alert("Type in your question!");
        txtMsg.focus();
        return;
    }


    var oHttp = new XMLHttpRequest();
    oHttp.open("POST", "https://api.openai.com/v1/chat/completions");
    oHttp.setRequestHeader("Accept", "application/json");
    oHttp.setRequestHeader("Content-Type", "application/json");
    oHttp.setRequestHeader("Authorization", "Bearer " + OPENAI_API_KEY)

    oHttp.onreadystatechange = function () {
        var s = "";

        if (oHttp.readyState === 4) {

            console.log(oHttp.status);
            console.log(oHttp.responseText);
            var oJson = {}
            if (txtOutput.value != "") txtOutput.value += "\n";

            try {
                oJson = JSON.parse(oHttp.responseText);
            } catch (ex) {
                txtOutput.value += "Error: " + ex.message
            }


            if (oJson.error && oJson.error.message) {
                txtOutput.value += "Error: " + oJson.error.message;


            }
            // Sucess        

            // check if GPT wanted to call a function
            else if (oJson.choices && oJson.choices[0].message.function_call) {


                if (oJson.choices[0].message.function_call) {

                    var functionToCall = oJson.choices[0].message.function_call.name;
                    var parameters = JSON.parse(oJson.choices[0].message.function_call.arguments);

                    

                    var functionResponse = "";


                    //  s = window[functionToCall](Object.values(parameters)[0]);
                    if (functionToCall == "guixt_get") {
                        functionResponse = guixt.get(Object.values(parameters)[0]);
                    }

                    if (functionToCall == "guixt_start_transaction") {
                        //s = guixt.process('subdirectory\\start_transaction', Object.values(parameters)[0]);
                        functionResponse = "Rufe folgende Transaktion auf: " + Object.values(parameters)[0];
                        guixt.input("OK:/O" + Object.values(parameters)[0]);
                    }
                    if (functionToCall == "guixt_get_all_fields") {

                        var jsonfields = guixt.process('get_all_fields', 'X')

                        // parse address data into JavaScript object
                        // var fields = JSON.parse(jsonfields);
                        guixt.set("allfields", jsonfields);

                        // functionResponse += jsonfields;
                        // Hohe kosten wenn alle Felder an den Chatbot geliefert werde...
                        // => erstmal nur Antwort
                        functionResponse = "Felder wurden ermittelt und in GuiXT variable allfields gespeichert"

                    }

                    if (functionToCall == "guixt_check_button_exists") {
                        if (parameters && Object.values(parameters).length >= 1) {

                            var searchButtonText = Object.values(parameters)[0];
                            var jsonfields = guixt.process('get_all_fields');
                            jsonfields = JSON.parse(jsonfields);

                            var foundElement = findButtonWithText(jsonfields,searchButtonText);

                            if (foundElement)
                            {
                                functionResponse = "A button with text " + foundElement.buttontext + " was found";

                            }
                            else
                            {
                                functionResponse = "No button was found with text " + searchButtonText;
                            }



                        }
                    }

                    if (functionToCall == "guixt_get_current_script")
                    {
                            var script = guixt.process('get_current_script');
                            functionResponse = script;


                    }

                    if (functionToCall == "guixt_save_script")
                    {
                        if (parameters) {

                           

                            // Jetzt können Sie auf das "scriptcontent"-Attribut zugreifen:
                            var scriptcontent = parameters.scriptcontent;

                            guixt.process('set_current_script', scriptcontent);
                            guixt.input("OK");

                            functionResponse = "The guixt script was written and activated";

                        }

                    }
                   



                    if (functionToCall == "guixt_info_create_pushbutton")
                    {
                        functionResponse = "Example: Pushbutton  (row,column)  \"Text on button\" \"Functioncode\"  size=(rows,columns) process=\"Name of an inputscript.txt\"";
                    }

                    
                    if (functionToCall == "guixt_info_create_inputfield")
                    {
                        functionResponse = "Example: InputField (RowStart,ColumnStart) \"Text for inputfield\" (RowEnd,columnEnd) size=\"size of input value\" Name=\"Name of guixt variable\" ";
                    }

                           
                    if (functionToCall == "guixt_info_create_box")
                    {
                        functionResponse = "Example: Box (RowStart,ColumnStart) (RowEnd,columnEnd) \"Title of the box\"";
                    }

                    

                    if (functionToCall == "guixt_create_transaction_menu") {

                        if (parameters && Object.values(parameters).length >= 2) {
                            var tcodes = Object.values(parameters)[0].split("@");
                            var tcodes_desc = Object.values(parameters)[1].split("@");
                            var newInputScript = "";

                            var text = [];

                            var boxHeight = 3 * tcodes.length + 5;
                            text.push("Box\t(0,2)\t(" + boxHeight + ",100)\t\"Chat GTP Transaktionsmenü\"");



                            tcodes.forEach((tcode, index) => {

                                // Generate GuiXT Script

                                newInputScript += tcode + ": " + tcodes_desc[index] + "\n";

                                text.push("Image\t(1.5,5) (4,65)\t\"white.res\"  -plain -transparent  textstring=\"" + tcodes_desc[index] + "\" textheight=23 textweight=4 textfont=\"Arial Unicode MS\" textcolor=\"RGB(15,122,210)\"");

                                text.push("Pushbutton\t(2,66)\t\"" + tcode + "\"\t\"/n" + tcode + "\" size=(2,14)");
                                text.push("Pushbutton\t(2,83)\t\"/O" + tcode + "\"\t\"/O" + tcode + "\" size=(2,14)");
                                text.push("offset (" + (3 * (index + 1)).toString() + ",0)");
                            });


                            // Um den gesamten Text als einen String zu bekommen, können Sie die join-Methode verwenden:
                            newInputScript = text.join("\n");

                            guixt.process('chatgtp_create_tcode_menu', newInputScript);
                            guixt.input("OK");

                            functionResponse = "The menu for the given transactions was created successfully.";

                        }

                        else {
                            functionResponse = "There was an error when trying to create the menu."
                        }

                    }

                    historyContext.push({ role: "function", name: functionToCall, content: functionResponse });

                    var data_2 = {
                        model: sModel,
                        messages: historyContext,
                        functions: functions,
                        max_tokens: iMaxTokens,
                        user: sUserId,
                        temperature: dTemperature,
                        frequency_penalty: 0.0, //Number between -2.0 and 2.0    
                        //Positive values decrease the model's likelihood 
                        //to repeat the same line verbatim.
                        presence_penalty: 0.0,    //Number between -2.0 and 2.0. 
                        //Positive values increase the model's likelihood 
                        //to talk about new topics.
                        stop: ["#", ";"]        //Up to 4 sequences where the API will stop 
                        //generating further tokens. The returned text 
                        //will not contain the stop sequence.
                    }

                    oHttp.open("POST", "https://api.openai.com/v1/chat/completions");
                    oHttp.setRequestHeader("Accept", "application/json");
                    oHttp.setRequestHeader("Content-Type", "application/json");
                    oHttp.setRequestHeader("Authorization", "Bearer " + OPENAI_API_KEY)
                    oHttp.send(JSON.stringify(data_2));

                    // guixt.SetText("chatbotanswer","Chat GPT: " + s);
                    // TextToSpeech(s);


                }

            }
            // Normal answer from chat gpt
            else if (oJson.choices && oJson.choices[0].message.content && oJson.choices[0].message) {

                // Add message to history contect
                historyContext.push(oJson.choices[0].message);

                s = oJson.choices[0].message.content;

                if (selLang.value != "en-US") {
                    var a = s.split("?\n");
                    if (a.length == 2) {
                        s = a[1];
                    }
                }

                if (s == "") s = "No response";
                txtOutput.value += "Chat GPT: " + s;
                guixt.SetText("chatbotanswer", "Chat GPT: " + s);
                TextToSpeech(s);
            }
        }
    };

    var sModel = selModel.value;
    var iMaxTokens = 2500;
    var sUserId = "1";
    var dTemperature = 0.5;

    historyContext.push({ role: "user", content: sQuestion });

    let functions = [
        {
            "name": "guixt_get",
            "description": "Get the value of a field on the sap screen",
            "parameters": {
                "type": "object",
                "properties": {
                    "fieldname": {
                        "type": "string",
                        "description": "The name of the field on the sap screen",
                    },
                },
                "required": ["fieldname"],
            }
        },
        {
            "name": "guixt_start_transaction",
            "description": "Start a sap transaction means enter a certain transaction code and go to this sap screen",
            "parameters": {
                "type": "object",
                "properties": {
                    "transactioncode": {
                        "type": "string",
                        "description": "The code of the transaction that should be started",
                    },
                },
                "required": ["transactioncode"],
            }
        },
        {
            "name": "guixt_get_all_fields",
            "description": "Get information about the fields and elements on the current SAP screen",
            "parameters": {
                "type": "object",
                "properties": {
                    "fieldnames": {
                        "type": "string",
                        "description": "The name of a variable for the fieldnames",
                    },
                },
            }
        },
        {
            "name": "guixt_create_transaction_menu",
            "description": "Create a nice quick menu for a list of transaction codes in sap with a description of the transaction",
            "parameters": {
                "type": "object",
                "properties": {
                    "tcodes": {
                        "type": "string",
                        "description": "The transaction codes, separated by @",
                    },
                    "descriptions": {
                        "type": "string",
                        "description": "The descriptions of the transaction codes, separated by @",
                    },
                },
            }
        },
        {
            "name": "guixt_check_button_exists",
            "description": "Check if a button with a given text does exist on the current sap screen",
            "parameters": {
                "type": "object",
                "properties": {
                    "buttontext": {
                        "type": "string",
                        "description": "Text text on the button",
                    },
                },
            }
        },
        {
            "name": "guixt_get_current_script",
            "description": "Get the current active guixt script for the screen as text",
            "parameters": {
                "type": "object",
                "properties": {},
            }
        },
        {
            "name": "guixt_save_script",
            "description": "Saves and activates a guixt script with the given string as input",
            "parameters": {
                "type": "object",
                "properties": {
                    "scriptcontent": {
                        "type": "string",
                        "description": "The text content of the new guixt script, only text is allowed",
                    },
                },
            }
        },        
        {
            "name": "guixt_info_create_pushbutton",
            "description": "Gets information on how to create a pushbutton with guixt",
            "parameters": {
                "type": "object",
                "properties": {},
            }
        },
        {
            "name": "guixt_info_create_inputfield",
            "description": "Gets information on how to create an inputfield with guixt",
            "parameters": {
                "type": "object",
                "properties": {},
            }
        },
        {
            "name": "guixt_info_create_box",
            "description": "Gets information on how to create an a box with guixt",
            "parameters": {
                "type": "object",
                "properties": {},
            }
        },

       





    ];



    var data = {
        model: sModel,
        messages: historyContext,
        functions: functions,
        max_tokens: iMaxTokens,
        user: sUserId,
        temperature: dTemperature,
        frequency_penalty: 0.0, //Number between -2.0 and 2.0    
        //Positive values decrease the model's likelihood 
        //to repeat the same line verbatim.
        presence_penalty: 0.0,    //Number between -2.0 and 2.0. 
        //Positive values increase the model's likelihood 
        //to talk about new topics.
        stop: ["#", ";"]        //Up to 4 sequences where the API will stop 
        //generating further tokens. The returned text 
        //will not contain the stop sequence.
    }

    oHttp.send(JSON.stringify(data));

    if (txtOutput.value != "") txtOutput.value += "\n";
    txtOutput.value += "Me: " + sQuestion;
    txtMsg.value = "";
}

function TextToSpeech(s) {
    if (bTextToSpeechSupported == false) return;
    if (chkMute.checked) return;

    oSpeechSynthesisUtterance = new SpeechSynthesisUtterance();

    if (oVoices) {
        var sVoice = selVoices.value;
        if (sVoice != "") {
            oSpeechSynthesisUtterance.voice = oVoices[parseInt(sVoice)];
        }
    }

    oSpeechSynthesisUtterance.onend = function () {
        //finished talking - can now listen
        if (oSpeechRecognizer && chkSpeak.checked) {
            oSpeechRecognizer.start();
        }
    }

    if (oSpeechRecognizer && chkSpeak.checked) {
        //do not listen to yourself when talking
        oSpeechRecognizer.stop();
    }

    oSpeechSynthesisUtterance.lang = selLang.value;
    oSpeechSynthesisUtterance.text = s;
    //Uncaught (in promise) Error: A listener indicated an 
    //asynchronous response by returning true, but the message channel closed   
    window.speechSynthesis.speak(oSpeechSynthesisUtterance);
}

function Mute(b) {
    if (b) {
        selVoices.style.display = "none";
    } else {
        selVoices.style.display = "";
    }
}

function reset() {
    txtOutput.value = "";
    historyContext = [];



}

function SpeechToText() {

    if (oSpeechRecognizer) {

        if (chkSpeak.checked) {
            oSpeechRecognizer.start();
        } else {
            oSpeechRecognizer.stop();
        }

        return;
    }

    oSpeechRecognizer = new webkitSpeechRecognition();
    oSpeechRecognizer.continuous = true;
    oSpeechRecognizer.interimResults = true;
    oSpeechRecognizer.lang = selLang.value;
    oSpeechRecognizer.start();

    oSpeechRecognizer.onresult = function (event) {
        var interimTranscripts = "";
        for (var i = event.resultIndex; i < event.results.length; i++) {
            var transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                txtMsg.value = transcript;
                Send();
            } else {
                transcript.replace("\n", "<br>");
                interimTranscripts += transcript;
            }

            var oDiv = document.getElementById("idText");
            oDiv.innerHTML = '<span style="color: #999;">' +
                interimTranscripts + '</span>';
        }
    };

    oSpeechRecognizer.onerror = function (event) {




    };
}








function findButtonWithText(jsonData, targetName) {
    const fuzzySearchThreshold = 0.85; // Adjust this threshold for fuzzy search sensitivity

    for(let i = 0; i < jsonData.length; i++) {

       if (jsonData[i].buttontext && typeof jsonData[i].buttontext === "string") {
            // Perform a fuzzy search using Levenshtein distance
            const tooltipName = jsonData[i].buttontext.toLowerCase();
            const searchName = targetName.toLowerCase();
            const distance = calculateLevenshteinDistance(tooltipName, searchName);
            const similarity = 1 - distance / Math.max(tooltipName.length, searchName.length);

            if (similarity >= fuzzySearchThreshold) {
                return jsonData[i];
            }
        }
    }

    return null; // If the tooltip with the specified name is not found
}

function calculateLevenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}