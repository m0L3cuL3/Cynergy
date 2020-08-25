/* Variables */
var user;
var timer
var socket;
var oldname;
var username;
var typeTimer;
var clients = [];
var usersTyping = [];
var nmr = 0;
var dev = true;
var unread = 0;
var focus = true;
var typing = false;
var connected = false;
var version = VERSION;
var blop = new Audio('sounds/blop.wav');
var regex = /(&zwj;|&nbsp;)/g;

var settings = {
    'name': null,
    'emoji': true,
    'inline': true,
    'sound': true,
};


/* Config */
emojione.ascii = true;
emojione.imageType = 'png';
emojione.unicodeAlt = false;


/* Connection */
var connect = () => {
    var protocol;

    if(window.location.protocol === 'https:') {
        protocol = 'wss://';
    } else {
        protocol = 'ws://';
    }

    socket = new WebSocket(protocol + window.location.host + '/socket/websocket');

    socket.onopen = () => {
        var ping = setInterval(() => {
            socket.send(JSON.stringify({type: 'ping'}));
        }, 50 * 1000);
        console.info('Connection established.');
        updateInfo();
    };

    socket.onclose = () => {
        clearTimeout(typeTimer);
        $('#admin').hide();
        $('#moderator').hide();
        $('#vip').hide();
        typing = false;
        clients = [];

        if(connected) {
            updateBar('mdi-action-autorenew spin', 'Connection lost, reconnecting...', true);

            timer = setTimeout(() => {
                console.warn('Connection lost, reconnecting...');
                connect();
            }, 1500);
        }
    };

    socket.onmessage = (e) => {
        var data = JSON.parse(e.data);

        if(dev) {
            console.log(data);
        }
        
        // when message is deleted
        if(data.type == 'delete') {
            return $('div[data-mid="' + data.message + '"]').remove();
        }

        // check if user/s are typing
        if(data.type == 'typing') {
            var string;
            if(data.user != username) {
                if(data.typing) {
                    usersTyping.push(data.user);
                } else {
                    usersTyping.splice(usersTyping.indexOf(data.user), 1);
                }
            }
            
            // check if multiple users are typing
            if(usersTyping.length == 1) {
                string = usersTyping + ' is writing...';
            } else if(usersTyping.length > 4) {
                string = 'Several people are writing...';
            } else if(usersTyping.length > 1) {
                var lastUser = usersTyping.pop();
                string = usersTyping.join(', ') + ' and ' + lastUser + ' are writing...';
                usersTyping.push(lastUser);
            } else {
                string = '<br>';
            }

            return document.getElementById('typing').innerHTML = string;
        }

        // SERVER
        if(data.type == 'server') {
            switch(data.info) {

                // check if username is valid or not
                case 'rejected':
                    var message;

                    if(data.reason == 'length') {
                        message = 'Your username must have at least 3 characters and no more than 16 characters';
                    }

                    if(data.reason == 'format') {
                        message = 'Your username must only contain alphanumeric characters (numbers, letters and underscores)';
                    }

                    if(data.reason == 'taken') {
                        message = 'This username is already taken';
                    }

                    if(data.reason == 'banned') {
                        message = 'You have been banned from the server for ' + data.time / 60 / 1000 + ' minutes. You have to wait until you get unbanned to be able to connect again';
                    }

                    showChat('light', null, message);

                    if(!data.keep) {
                        username = undefined;
                        connected = false;
                    } else {
                        username = oldname;
                    }
                    break;

                // update UI after user validation
                case 'success':
                    document.getElementById('send').childNodes[0].nodeValue = 'Send';
                    updateBar('mdi-content-send', 'Enter your message here', false);
                    connected = true;
                    settings.name = username;
                    localStorage.settings = JSON.stringify(settings);
                    break;

                // update username after user executes the command /name
                case 'update':
                    showChat('info', null, data.user.oldun + ' changed its name to ' + data.user.un);
                    clients[data.user.id] = data.user;
                    break;

                // show users connected to the server
                case 'connection':
                    var userip = data.user.ip ? ' [' + data.user.ip + ']' : '';
                    showChat('info', null, data.user.un + userip + ' connected to the server');

                    clients[data.user.id] = data.user;
                    document.getElementById('users').innerHTML = Object.keys(clients).length + ' USERS';
                    break;

                // show users disconnected from the server and remove them from memory
                case 'disconnection':
                    var userip = data.user.ip ? ' [' + data.user.ip + ']' : '';

                    if(data.user.un != null) {
                        showChat('info', null, data.user.un + userip + ' disconnected from the server');
                    }

                    delete clients[data.user.id];
                    document.getElementById('users').innerHTML = Object.keys(clients).length + ' USERS';
                    break;

                // execute when user sends message to fast
                case 'spam':
                    showChat('global', null, 'You have to wait 1 second between messages. Continuing on spamming the servers may get you banned. Warning ' + data.warn + ' of 5');
                    break;

                // update number of users
                case 'clients':
                    clients = data.clients;
                    document.getElementById('users').innerHTML = Object.keys(clients).length + ' USERS';
                    break;

                // assign user id
                case 'user':
                    user = data.client.id;
                    break;
            }
        } else if ((data.type == 'kick' || data.type == 'ban') && data.extra == username) { // if user is kicked or banned
            location.reload();
        } else {
            if(data.message.indexOf('@' + username) > -1) { // mentions
                data.type = 'mention';
            }
           
            showChat(data.type, data.user, data.message, data.subtxt, data.mid);
        }

        // ROLES
        if(data.type == 'role') {
            if(getUserByName(data.extra) != undefined) {

                // check if user is USER.
                if(data.extra == username && data.role == 0) {
                    $('#admin').hide();
                    $('#moderator').hide();
                    $('#menu-admin').hide();
                }
                
                // check if user is VIP
                if(data.extra == username && data.role == 1) {
                    $('#vip').show();
                    $('#menu-admin').show();
                }

                // check if user is MODERATOR
                if(data.extra == username && data.role == 2) {
                    $('#moderator').show();
                    $('#menu-admin').show();
                }

                // check if user is ADMINISTRATOR
                if(data.extra == username && data.role == 3) {
                    $('#admin').show();
                    $('#menu-admin').show();
                }

                

                clients[getUserByName(data.extra).id].role = data.role;
            }
        }

        // Notify browser
        if(data.type == 'global' || data.type == 'pm' || data.type == 'mention') {
            if(!focus) {
                unread++;
                document.title = '(' + unread + ') Notification';

                // play sound when browser receives a message
                if(settings.sound) {
                    blop.play();
                }
            }
        }
    }
};


/* Functions */

// send messages
function sendSocket(value, method, other, txt) {
    socket.send(JSON.stringify({
        type: method,
        message: value,
        subtxt: txt,
        extra: other
    }));
}

// update user info
function updateInfo() {
    socket.send(JSON.stringify({
        user: username,
        type: 'update'
    }));
}

// gets user by name
function getUserByName(name) {
    for(client in clients) {
        if(clients[client].un == name) {
            return clients[client];
        }
    }
}

// updates textbox
function updateBar(icon, placeholder, disable) {
    document.getElementById('icon').className = 'mdi ' + icon;
    $('#message').attr('placeholder', placeholder);
    $('#message').prop('disabled', disable);
    $('#send').prop('disabled', disable);
}

// show chat messages
function showChat(type, user, message, subtxt, mid) {
    var nameclass = '';

    if(type == 'global' || type == 'kick' || type == 'ban' || type == 'info' || type == 'light' || type == 'help' || type == 'role') {
        user = 'System';
    }

    if(type == 'me' || type == 'em') {
        type = 'emote';
    }

    if(!mid) {
        mid == 'system';
    }

    if(type == 'emote' || type == 'message') {
        if(user == username && getUserByName(user).role == 0) {
            nameclass = 'self';
        } else {
            if(getUserByName(user).role == 1) nameclass = 'vip';
            if(getUserByName(user).role == 2) nameclass = 'moderator';
            if(getUserByName(user).role == 3) nameclass = 'administrator';
        }
    }

    if(!subtxt) {
        $('#panel').append('<div data-mid="' + mid + '" class="' + type + '""><span class="name ' + nameclass + '"><b><a class="namelink" href="javascript:void(0)">' + user + '</a></b></span><span class="delete"><a href="javascript:void(0)">DELETE</a></span><span class="timestamp">' + getTime() + '</span><span class="msg">' + message + '</span></div>');
    } else {
        $('#panel').append('<div data-mid="' + mid + '" class="' + type + '""><span class="name ' + nameclass + '"><b><a class="namelink" href="javascript:void(0)">' + user + '</a></b></span><span class="timestamp">(' + subtxt + ') ' + getTime() + '</span><span class="msg">' + message + '</span></div>');
    }
    
    $('#panel').animate({scrollTop: $('#panel').prop('scrollHeight')}, 500);
    updateStyle();
    nmr++;
    
    if(settings.inline) {
        var m = message.match(/(https?|ftp):\/\/[^\s/$.?#].[^\s]*/gmi);

        if(m) {
            m.forEach((e, i, a) => {
                // Gfycat Support
                if(e.indexOf('//gfycat') !== -1) {
                    var oldUrl = e;
                    e = e.replace('//gfycat.com', '//gfycat.com/cajax/get').replace('http://', 'https://');

                    $.getJSON(e, (data) => {
                        testImage(data.gfyItem.gifUrl.replace('http://', 'https://'), mid, oldUrl);
                    });
                } else {
                    testImage(e, mid, e);
                }
            });
        }
    }
}

// test image from url
function testImage(url, mid, oldUrl) {
    var img = new Image();

    img.onload = () => {
        $('div[data-mid=' + mid + '] .msg a[href="' + oldUrl.replace('https://', 'http://') + '"]').html(img);
        $('#panel').animate({scrollTop: $('#panel').prop('scrollHeight')}, 500);
    };

    img.src = url;
}


function handleInput() {
    var value = $('#message').val().replace(regex, ' ').trim();

    if(value.length > 0) {
        if(username === undefined) {
            username = value;
            connect();
        } else if(value.charAt(0) == '/') {
            var command = value.substring(1).split(' ');

            // commands
            switch(command[0].toLowerCase()) {
                case 'pm': case 'msg': case 'role': case 'kick': case 'ban': case 'name': case 'alert': case 'me': case 'em':
                    if(value.substring(command[0].length).length > 1) {
                        if((command[0] == 'pm' || command[0] == 'msg') && value.substring(command[0].concat(command[1]).length).length > 2) {
                            sendSocket(value.substring(command[0].concat(command[1]).length + 2), 'pm', command[1], 'PM');
                        } else if(command[0] == 'pm' || command[0] == 'msg') {
                            showChat('light', 'Error', 'Use /' + command[0] + ' [user] [message]');
                        }

                        if(command[0] == 'ban' && value.substring(command[0].concat(command[1]).length).length > 2) {
                            sendSocket(command[1], 'ban', command[2]);
                        } else if(command[0] == 'ban') {
                            showChat('light', 'Error', 'Use /ban [user] [minutes]');
                        }

                        if(command[0] == 'alert') {
                            sendSocket(value.substring(command[0].length + 2), 'global', null, username);
                        }

                        if((command[0] == 'role') && value.substring(command[0].concat(command[1]).length).length > 3) {
                            sendSocket(command[1], 'role', value.substring(command[0].concat(command[1]).length + 3));
                        } else if(command[0] == 'role') {
                            showChat('light', 'Error', 'Use /' + command[0] + ' [user] [0-3]');
                        }

                        if(command[0] == 'kick' || command[0] == 'me' || command[0] == 'em') {
                            sendSocket(value.substring(command[0].length + 2), command[0]);
                        }

                        if(command[0] == 'name') {
                            oldname = username;
                            username = value.substring(command[0].length + 2);
                            updateInfo();
                        }
                    } else {
                        var variables;
                        if(command[0] == 'alert' || command[0] == 'me' || command[0] == 'em') {
                            variables = ' [message]';
                        }

                        if(command[0] == 'role') {
                            variables = ' [user] [0-3]';
                        }

                        if(command[0] == 'ban') {
                            variables = ' [user] [minutes]';
                        }

                        if(command[0] == 'pm') {
                            variables = ' [user] [message]';
                        }

                        if(command[0] == 'kick') {
                            variables = ' [user]';
                        }

                        if(command[0] == 'name') {
                            variables = ' [name]';
                        }

                        showChat('light', 'Error', 'Use /' + command[0] + variables);
                    }
                    break; 

                case 'clear':
                    nmr = 0;
                    document.getElementById('panel').innerHTML = '';
                    showChat('light', 'System', 'Messages cleared');
                    break;

                case 'shrug':
                    sendSocket(value.substring(6) + ' ¯\\_(ツ)_/¯', 'message');
                    break;

                case 'help':
                    $('#help-dialog').modal('show');
                    break;

                case 'users':
                    $('#user').click();
                    break;

                case 'reconnect':
                    socket.close();
                    break;

                default:
                    showChat('light', 'Error', 'Unknown command, use /help to get a list of the available commands');
                    break;
            }
        } else {
            sendSocket(value, 'message');
        }

        $('#message').val('');
    }
}

// get time
function getTime() {
    var now = new Date();
    var time = [now.getHours(), now.getMinutes(), now.getSeconds()];
 
    for(var i = 0; i < 3; i++) {
        if(time[i] < 10) {
            time[i] = '0' + time[i];
        }
    }
 
    return time.join(':');
}

// update css styles
function updateStyle() {
    $('#panel').linkify();
    var element = document.getElementsByClassName('msg')[nmr];

    if(element.innerHTML != undefined) {

        if(settings.emoji) {
            var input = element.innerHTML;
            var output = emojione.shortnameToImage(element.innerHTML);
            element.innerHTML = output;
        }
    }
}


/* Binds */
$(document).ready( () => {
    $('#user').bind('click', () => {
        var content = '';
        var userip = '';
        var admin;

        for(var i in clients) {
            if(clients[i] != undefined) {
                if(clients[i].ip) {
                    userip = '(' + clients[i].ip + ')';
                }

                if(clients[i].role === 0) {
                    admin = '</li>';
                }
                
                if(clients[i].role === 1) {
                    admin = ' - <b>VIP</b></li>';
                }

                if(clients[i].role === 2) {
                    admin = ' - <b>Moderator</b></li>';
                }

                if(clients[i].role === 3) {
                    admin = ' - <b>Administrator</b></li>';
                }

                content += '<li>' + '<b>#' + clients[i].id + '</b> ' + userip + ' - ' + clients[i].un + admin;
            }
        }

        document.getElementById('users-content').innerHTML = content;
        $('#users-dialog').modal('show');
    });

    $('#panel').on('mouseenter', '.message', () => {
        if(clients[user].role > 0) {
            $(this).find('span:eq(1)').show();
            $(this).find('span:eq(2)').hide();
        }
    });

    $('#panel').on('mouseleave', '.message', () => {
        if(clients[user].role > 0) {
            $(this).find('span:eq(1)').hide();
            $(this).find('span:eq(2)').show();
        }
    });

    $('#panel').on('mouseenter', '.emote', () => {
        if(clients[user].role > 0) {
            $(this).find('span:eq(1)').show();
            $(this).find('span:eq(2)').hide();
        }
    });

    $('#panel').on('mouseleave', '.emote', () => {
        if(clients[user].role > 0) {
            $(this).find('span:eq(1)').hide();
            $(this).find('span:eq(2)').show();
        }
    });

    $('#panel').on('click', '.delete', (e) => {
        var value = $(this)[0].parentElement.attributes[0].value;
        sendSocket(value, 'delete');
    });

    $('#panel').on('click', '.name', (e) => {
        $('#message').val('@' + $(this)[0].children[0].children[0].innerHTML + ' ');
        $('#message').focus();
    });

    $('#send').bind('click', () => {
        handleInput();
    });

    $('#menu-admin').bind('click', () => {
        $('#admin-help-dialog').modal('show');
    });

    $('#help').bind('click', () => {
        $('#help-dialog').modal('show');
    });

    $('#options').bind('click', () => {
        $('#options-dialog').modal('show');
    });

    $('#emoji').bind('change', () => {
        settings.emoji = document.getElementById('emoji').checked;
        localStorage.settings = JSON.stringify(settings);
    });

    $('#sound').bind('change', () => {
        settings.sound = document.getElementById('sound').checked;
        localStorage.settings = JSON.stringify(settings);
    });
    
    $('#inline').bind('change', () => {
        settings.inline = document.getElementById('inline').checked;
        localStorage.settings = JSON.stringify(settings);
    });

    $('#message').keypress( (e) => {
        if(e.which == 13) {
            if(connected && typing) {
                typing = false;
                clearTimeout(typeTimer);
                socket.send(JSON.stringify({type:'typing', typing:false}));
            }
            handleInput();
        } else if(connected) {
            if(!typing) {
                typing = true;
                socket.send(JSON.stringify({type:'typing', typing:true}));
            }

            clearTimeout(typeTimer);
            typeTimer = setTimeout( () => {
                typing = false;
                socket.send(JSON.stringify({type:'typing', typing:false}));
            }, 2000);
        }
    });

    // addition keypress binding for handling autocompletion
    $("#message").keypress( (event) => {

        // don't navigate away from the field on tab when selecting an item
        if (event.keyCode === $.ui.keyCode.TAB )
            event.preventDefault();
    })
    .autocomplete({
        minLength: 0,
        source: (request, response) => {
            var term = request.term;
            var results = [];
            term = term.split(/ \s*/).pop();

            if (term.length > 0 && term[0] === '@') {
                var names = $.map( clients, (val) => { 
                    return val.un; 
                });
                results = $.ui.autocomplete.filter(names, term.substr(1));
            }
            response(results);
        },
        focus: () => {
            return false; // prevent value inserted on focus
        },
        select: (event, ui) => {
            var terms = this.value.split(/ \s*/);
            var old = terms.pop();  // get old word
            var ins = "@" + ui.item.value + " "; //new word to insert
            var ind = this.value.lastIndexOf(old); // location to insert at
            this.value = this.value.slice(0,ind) + ins;
            return false;
        }
    });
});

/* Internal */

if(typeof(Storage) !== 'undefined') {
    if(!localStorage.settings) {
        localStorage.settings = JSON.stringify(settings);
    } else {
        settings = JSON.parse(localStorage.settings);
        document.getElementById('emoji').checked = settings.emoji;
        document.getElementById('inline').checked = settings.inline;
        document.getElementById('sound').checked = settings.sound;
    }
}

window.onfocus = () => {
    document.title = 'Cynergy Chat';
    focus = true;
    unread = 0;
};


window.onblur = () => {
    focus = false;
};