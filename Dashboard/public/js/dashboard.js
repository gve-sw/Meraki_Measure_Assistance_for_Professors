// initiate the codes
$(document).ready(function(){
  getToday();
  changeDate();
});

// set the date field to today
function getToday(){
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth()+1;
  var date = today.getDate();
  if(month < 10){
    month = "0" + month;
  }
  if(date < 10){
    date = "0" + date;
  }
  var fulldate = year + "-" + month + "-" + date;
  $('#date').val(fulldate);
}

// dynamic change on table display when date field is changed
function changeDate(){
  var selectedDate = new Date($('#date').val());
  var day = selectedDate.getDay();
  var dayone = new Date(selectedDate.setDate(selectedDate.getDate() - day));
  var daytwo = new Date(selectedDate.setDate(selectedDate.getDate() + 1));
  var daythree = new Date(selectedDate.setDate(selectedDate.getDate() + 1));
  var dayfour = new Date(selectedDate.setDate(selectedDate.getDate() + 1));
  var dayfive = new Date(selectedDate.setDate(selectedDate.getDate() + 1));
  var daysix = new Date(selectedDate.setDate(selectedDate.getDate() + 1));
  var dayseven = new Date(selectedDate.setDate(selectedDate.getDate() + 1));
  $('#dayone').text(doubleDigit(dayone.getDate()) + "/" + doubleDigit(dayone.getMonth() + 1) + "/" + dayone.getFullYear());
  $('#daytwo').text(doubleDigit(daytwo.getDate()) + "/" + doubleDigit(daytwo.getMonth() + 1) + "/" + dayone.getFullYear());
  $('#daythree').text(doubleDigit(daythree.getDate()) + "/" + doubleDigit(daythree.getMonth() + 1) + "/" + dayone.getFullYear());
  $('#dayfour').text(doubleDigit(dayfour.getDate()) + "/" + doubleDigit(dayfour.getMonth() + 1) + "/" + dayone.getFullYear());
  $('#dayfive').text(doubleDigit(dayfive.getDate()) + "/" + doubleDigit(dayfive.getMonth() + 1) + "/" + dayone.getFullYear());
  $('#daysix').text(doubleDigit(daysix.getDate()) + "/" + doubleDigit(daysix.getMonth() + 1) + "/" + dayone.getFullYear());
  $('#dayseven').text(doubleDigit(dayseven.getDate()) + "/" + doubleDigit(dayseven.getMonth() + 1) + "/" + dayone.getFullYear ());

  // set each table cell id to work with data passed from backend
  $('.weeklyattendance').each(function(){
    $(this).attr("id", $(this).attr("data-prof") + "-" + $('#' + $(this).attr("data-day")).text());
  });

  var date = $('#date').val();
  console.log(date);
  var dateinid = date.substring(8) + "/" + date.substring(5, 7) + "/" + date.substring(0, 4);
  $('.dailyattendance').each(function(){
    $(this).attr("id", $(this).attr("data-prof") + "-" + dateinid + "-" + $(this).attr("data-time"));
  });

  // indicate attendance according to data passed from backend
  $('.weeklyattendance').each(function(){
    if(($('#hiddendata').attr('data-weekly')).includes($(this).attr("id"))){
      $(this).text("Yes");
    }else{
      $(this).text("No");
    }
  });

  $('.dailyattendance').each(function(){
    if(($('#hiddendata').attr('data-daily')).includes($(this).attr("id"))){
      $(this).removeClass('progressbar--dark progressbar--small');
      $(this).addClass('progressbar--success');
    }else{
      $(this).addClass('progressbar--dark progressbar--small');
      $(this).removeClass('progressbar--success');
    }
  });
}

// listener for showBy field change
function changeShowBy(){
  if($('#showby').val() == 'weekly'){
    $('#dailytable').addClass('hidden');
    $('#weeklytable').removeClass('hidden');
  }else{
    $('#weeklytable').addClass('hidden');
    $('#dailytable').removeClass('hidden');
  }
}

// deal with date formatting
function doubleDigit(input){
  if(input < 10){
    return "0" + input;
  }else{
    return input;
  }
}
