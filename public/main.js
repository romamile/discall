$(function() {
  var TYPING_TIMER_LENGTH = 400; // ms

  // Initialize variables
  var $window = $(window);
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $inputMessage.focus();

  var socket = io();

  // ==============================
  // 0) Init
    $chatPage.show();
    socket.emit('add user', "userTest");


  // ==============================
  // 1) SENDING A MESSAGE

  // Prevents input from having injected markup
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

  // Sends a chat message
  const sendMessage = () => {
    // Prevent markup from being injected into the message
    var message = cleanInput( $inputMessage.val() );

    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({message: message}, true);

      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  }

  
  // ==============================
  // 2) ADDING MESSAGES/LOG TO THE LIST

  // Adds the visual chat message to the message list
  const addChatMessage = (data, fromMe) => {

    var $typingMessages = getTypingMessages(data);
    if ($typingMessages.length !== 0) {
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(fromMe ? "Me" : "You")
      .css('color', fromMe ? '#e21400' : '#f78b00');

    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';

    var $messageDiv = $('<li class="message"/>')
      .data('fromMe', fromMe)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    $messages.append($messageDiv);
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }


  // ==============================
  // 3) "IS TYPING" NOTIFICATION

  // Removes the visual chat typing message
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Updates the typing event
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  const getTypingMessages = (data, fromMe) => {
    return $('.typing.message').filter(function (i) {
      return $(this).data('fromMe') === fromMe;
    });
  }


  // ==============================
  // 4) Click & Keyboard events

  $window.keydown(event => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
    }
  });

  $inputMessage.on('input', () => {
    updateTyping();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(() => {
    $inputMessage.focus();
  });


  // ==============================
  // 5) Socket events

  // Log a message
  const log = (message) => {
    var $el = $('<li>').addClass('log').text(message);
    $messages.append($el);
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Whenever the server emits 'login', log the login message
  socket.on('login', (data) => {
    connected = true;
    // Display the welcome message
    var message = "Welcome to Socket.IO Chat – ";
    log(message);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', (data) => {
    addChatMessage(data, false);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', (data) => {
    log("Someone"  + ' joined');
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', (data) => {
    log("Someone" + ' left');
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', (data) => {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data, false);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', (data) => {
    removeChatTyping(data);
  });

  socket.on('disconnect', () => {
    log('you have been disconnected');
  });

  socket.on('reconnect', () => {
    log('you have been reconnected');
      socket.emit('add user', "userTest");
  });

  socket.on('reconnect_error', () => {
    log('attempt to reconnect has failed');
  });

});
