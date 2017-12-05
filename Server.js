var express = require('express');
var app = express();
var events = require('events');
var formidable = require('formidable');
var fs = require('fs');
var nodemailer = require('nodemailer');
var XLSX = require('xlsx');
var bodyParser=require('body-parser');
var FCM = require('fcm-node')
var serverKey = require(__dirname+'/result_files/fastresult.json')
var fcm = new FCM(serverKey)
var urlencodedParser=bodyParser.urlencoded({extended:false})
var favicon=require('serve-favicon')
app.use(favicon(__dirname+'/icons/fastResults.png'));

app.use(express.static('soops'));
app.use(express.static('register'))
app.use(express.static('login'))
app.use(express.static('admin'))
app.use(express.static('icons'))
cookieParser = require('cookie-parser');
var session = require('express-session')
app.use(cookieParser());
app.use(session({
    secret: '34SDgsdgspxasasxxxxxxdfsG', // just a long random string
    resave: false,
    saveUninitialized: true
}));

//--------------------------------------
// 			Database
 var mysql = require('mysql');
 var con = mysql.createConnection
 ({
	 host: "localhost",
	 user: "Username removed",
	 password: "Password Removed",
	 database: "fastresult"
 });

//------------------------------------------
//             mail
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth:
  {
    user: 'Email address removed',
    pass: 'Password removed'
  }
});

//------------------------------------------------------
//				create Server

var server = app.listen(8081, function ()

{
	//var host = server.address().address
	//var port = server.address().port
  	//console.log("Example app listening at http://%s:%s", host, port)
	console.log('\n\n----------------Server Started------------\n\n')
})


//-----------------------------------------------------------------
//                               HTTP requests

app.post('/register',urlencodedParser, function (req, res)
{
	if(req.body.name==undefined || req.body.usn==undefined || req.body.branch==undefined || req.body.phno==undefined)
		res.sendFile(__dirname+'/register/register.html');
	else
		registerDB(req.body.name,req.body.usn,res,req.body.branch,req.body.phno);
})


app.get('/get_register', function (req, res)
{
	res.sendFile(__dirname+'/register/register.html');
})

app.get('/admin_login', function (req, res)
{
 	res.sendFile(__dirname+'/login/Login.html');
})

app.get('/get_login', function (req, res)
{
 	res.sendFile(__dirname+'/login/otp.html');
})

app.post('/otp',urlencodedParser,function (req,res)
{
  console.log(req.body.usn)
  if(req.body.usn=='admin')
 	res.sendFile(__dirname+'/login/Login.html');
  else
	eventEmitter.emit('mailPassVarEm',req.body.usn,res);
})

app.post('/login',urlencodedParser, function (req, res)
{
	if(req.body.usn==undefined || req.body.password==undefined)
 		res.sendFile(__dirname+'/login/Login.html');
	else
		eventEmitter.emit('getPassword',req.body.usn,req.body.password,res,0,req.sessionID);
})

app.post('/fileupload',function(req,res)
{

  var sql='select httptoken from register where usn="admin"';
  	con.query(sql,function(err,result)
	{
		if(err) throw err;
   		if(result[0].httptoken==req.sessionID)
  		{
			var form = new formidable.IncomingForm();
			form.parse(req, function (err, fields, files)
			{
				var oldpath =files.filetoupload.path;
				var newpath = __dirname +"/result_files/"+ files.filetoupload.name;
				fs.rename(oldpath, newpath, function (err)
				{
					if (err) throw err;
					res.sendFile(__dirname+'/admin/adminSucc.html');
					eventEmitter.emit('saveExceldb',newpath);
				})
			})
		}
		else
			res.send('Invalid request');
	})
})

app.get('/SingleUserDictionaryUpdate',function (req,res)
{

  var sql='select httptoken from register where usn="admin"';
  	con.query(sql,function(err,result)
	{
		if(err) throw err;
   		if(result[0].httptoken==req.sessionID)
  		{
			eventEmitter.emit('insertUserDictionary',req.query.usn,req.query.email);

					res.sendFile(__dirname+'/admin/adminSucc.html');
  		}
  		else
  		{
			res.write("Invalid request! Please login.");
			res.end();
  		}
	})
 })

app.get('/SingleUserResultUpdate',function (req,res)
{
  var sql='select httptoken from register where usn="admin"';
  	con.query(sql,function(err,result)
	{
		if(err) throw err;
   		if(result[0].httptoken==req.sessionID)
		{
  		  eventEmitter.emit('insertUserResult',req.query.usn,req.query.cgpa);
					res.sendFile(__dirname+'/admin/adminSucc.html');

		}
		else
		{

			res.write("Invalid request! Please login.");
			res.end();
		}

	})
})

app.post('/loginAndroid',urlencodedParser, function (req, res)
{
	eventEmitter.emit('getPassword',req.body.usn,req.body.password,res,1);
})

app.get('/result_noti', function (req, res)
{
  /*	var sql='select httptoken from register where usn="admin"';
  	con.query(sql,function(err,result)
	{
		if(err) throw err;
		console.log(result)
   		if(1==1)
		{*/
 			eventEmitter.emit('notifyResults');
			res.sendFile(__dirname+'/admin/adminSucc.html');
		/*}
		else
		{

			res.write("Invalid request! Please login.");
			res.end();
		}
	}) */
})



app.post('/tokenUpdate',urlencodedParser,function (req,res)
{
  if(req.body.token==undefined || req.body.usn==undefined)
	res.send("Invalid request!");
  else
  {
	  var sql = 'update register set token="'+req.body.token+'" where usn= "'+req.body.usn+'"';
	  con.query(sql, function (err, result1)
  	 {
   	        if (err) throw err;
         	res.send('1');

  	});
  }
})

app.post('/fileUserDictionaryUpdate',function(req,res)
{
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, fields, files)
	{
		var oldpath =files.filetoupload.path;
		var newpath = __dirname +"/result_files/"+ files.filetoupload.name;
		fs.rename(oldpath, newpath, function (err)
		{
				if (err) throw err;
					res.sendFile(__dirname+'/admin/adminSucc.html');

				eventEmitter.emit('updateUserDictionary',newpath);

		})
	})

})



//------------------------------------------------------------------
//			functions

var HttpTokenUpdate=function updateToken(usn,httptoken)
{

      		var sql1 = 'update register set httptoken="'+httptoken+'" where usn= "'+usn+'"';
        	con.query(sql1, function (err, result1)
      	 	{
      		 	if (err) throw err;
      	 	});
}


function registerDB(name,usn,res,branch,phno)
{
    var sql='select usn,password from register where usn="'+usn+'"';
    con.query(sql, function (err, result)
	 	{
		 	if (err) throw err;

      			if(result[0]==undefined)
      			{
		      		res.send('USN not exist! Please contact administrator');
	    		}
	     		else if(result[0].password!=undefined)
       			{
     				res.sendFile(__dirname+'/login/LoginAregistered.html');
       			}
       			else
	     		{
				var t=Math.floor((Math.random()*17640)+Math.random()*18459)+"";
      				var sql1 = 'update register set name="'+name+'" , password="'+t+'", branch="'+branch+'", phone="'+phno+'"  where usn= "'+usn+'"';

				con.query(sql1, function (err, result1)
      	 			{
      			 		if (err) throw err;
				//	res.sendFile(__dirname+'/login/Login.html');
					     eventEmitter.emit('mailPassVarEm',usn,res);

      	 			});
       			}
    		})
}

var funPass=function getPasswords(usn,passwrd,res,flag,sessionID)
{

	var sql='select password from register where usn="'+usn+'"';
	con.query(sql,function(err,result)
	{
		if(err) throw err;
		if(result[0]!=undefined && passwrd==result[0].password)
		{
			if(usn=="admin")
			{
        			eventEmitter.emit('HttpTokenUpdate','admin',sessionID);
				res.sendFile(__dirname+'/admin/admin.html');
			}
			else if(flag==0)   // browser login
      			{
    			        eventEmitter.emit('HttpTokenUpdate',usn,sessionID);
       				eventEmitter.emit('sendResult',usn,res);
			}
     			 else // Android login
        			res.send("shreesha");
		}
		else
		{
 			res.sendFile(__dirname+'/login/LoginFail.html');
		}
	})
}

var mailPassVar=function mailPass(usn,res)
{
	var sql='select email,password,name from register where usn="'+usn+'"';
	con.query(sql,function(err,result)
	{
		if(err) throw err;
		try
		{
    		if(result[0].password==undefined || result[0].email==undefined)
       			 res.send("Email or password does not exist!")
  	 	else
    		{


          var t=Math.floor((Math.random()*17640)+Math.random()*18459)+"";
        				var sql1 = 'update register set password="'+t+'"  where usn= "'+usn+'"';

  				con.query(sql1, function (err, result1)
        	 			{
        			 		if (err) throw err;
  				//	res.sendFile(__dirname+'/login/Login.html');
          res.sendFile(__dirname+'/login/Login.html');
          eventEmitter.emit('sendEmail',result[0].email,t,result[0].name);
        	 			});


    		}
		}
		catch(ex)
		{

       			 res.send("Email or password does not exist!");
		}
 	 })
}


var saveResultDB=function excelToDb(fileName)
{
	var workbook = XLSX.readFile(fileName,{type:"array"});
	var worksheet = workbook.Sheets[workbook.SheetNames[0]];
	for(var i=0;i<262;i++)
	{
		var desired_usn_cell=worksheet['A'+i]
		var desired_cgpa_cell=worksheet['B'+i]
		var desired_usn = (desired_usn_cell ? desired_usn_cell.v :undefined );
		var desired_cgpa = (desired_cgpa_cell ? desired_cgpa_cell.v :undefined );
		if(desired_usn!=undefined)
		{
			var sql = 'INSERT INTO result (usn, cgpa) VALUES ("'+desired_usn+'","'+desired_cgpa+'")';
			con.query(sql, function (err, result)
			{
				if (err) throw err;
			});
		}
	}
	console.log('Admin: Result file loaded');
}


var sendMail=function mailSending(recepient,pass,name)
{
  var mailOptions =
  {
    from: 'Fast Results',
    to: recepient,
    subject: 'FastResults Account Password',
    text: 'Dear '+name+',\n\nYour account password will be '+pass+'.\n\nThank you,\nTeam FastResults\nnoreplyfastresults@gmail.com'
  };

  transporter.sendMail(mailOptions, function(error, info)
  {
    if (error)
    {
      console.log(error);
    }
    else
	console.log("Email sent:"+info+"\n")
  });
}

var returnResult=function sendResult(usn,res)
{
  var sql='select cgpa from result where usn="'+usn+'"';
	con.query(sql,function(err,result)
	{
		if(err) throw err;

    	if(result[0]==undefined)
        	res.send("We are sorry! User result not available!")
    else
    {
		res.writeHead(200,{ 'Set-Cookie': "usn="+usn+"",'Content-Type': 'text/html'});
	    res.write('<!doctype html>');
        res.write('<html lang="en">');
          res.write('<head>');
          res.write('  <title>Result</title>');
            res.write('<!-- Required meta tags -->');
            res.write('<meta charset="utf-8">');
            res.write('<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">');

            res.write('<!-- Bootstrap CSS -->');
          res.write('  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.2/css/bootstrap.min.css" integrity="sha384-PsH8R72JQ3SOdhVi3uxftmaW6Vc51MKb0q5P2rRUpPvrszuE4W1povHYgTpBfshb" crossorigin="anonymous">');
        res.write('  </head>');
        res.write('  <body>');
          res.write('  <nav class="navbar navbar-default custom-header customeNav">');
              res.write('  <div class="container-fluid">');
                  res.write('  <div class="navbar-header">');

                    res.write('  <h3>  <a class="customeA inactiveLink" >Fast<span>Results </span></a> </h3>');
                  res.write('  </div>');
                  res.write('    <form action="/" method="get">');
                    res.write('    <button class="btn btn-primary navbar-btn navbar-right" type="submit">Logout</button>');
                    res.write('  </form>');

            res.write('    </div>');
          res.write('  </nav>');
        res.write('  </br>');
        res.write('  </br>');
        res.write('  </br>');
        res.write('  </br>');
        res.write('    <style>');
          res.write('  .inactiveLink');
          res.write('  {');
          res.write('        color: #ffffff');
            res.write('      pointer-events: none;');
            res.write('      cursor: default;');
          res.write('  }');


          res.write('  h1');
          res.write('  {');
        res.write('          color: #000000;');
          res.write('          text-align: center;');
          res.write('  }');
          res.write('  h3');
          res.write('  {');
          res.write('        color: #FFfFff;');
          res.write('  }');

          res.write('  .customeNav');
          res.write('  {');
          res.write('        background-color: #311B92');

          res.write('  }');


          res.write('  </style>');
      res.write('  <centre> <h1>Your result is '+result[0].cgpa+'</h1>');
  res.write('  </centre>');
      res.write('  <!-- Optional JavaScript -->');
      res.write('  <!-- jQuery first, then Popper.js, then Bootstrap JS -->');
      res.write('  <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script>');
      res.write('  <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.3/umd/popper.min.js" integrity="sha384-vFJXuSJphROIrBnz7yo7oB41mKfc8JzQZiCq4NCceLEaO4IHwicKwpJf9c9IpFgh" crossorigin="anonymous"></script>');
      res.write('  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.2/js/bootstrap.min.js" integrity="sha384-alpBpkh1PFOepccYVYDB4do5UnbKysX5WZXm3XxPqe5iKTfUKjNkCk9SaVuEZflJ" crossorigin="anonymous"></script>');
    res.write('  </body>');
    res.write('</html>');
    res.end();
    }
  })
}

var notifyResults=function notify()
{
  sql='select token,cgpa from (result left outer join register on result.usn=register.usn) where token!="null"';

  con.query(sql,function(err,result)
  {
	for(var i=0;i<result.length;i++)
    {
          if(result[i]!=undefined)
          {
		console.log("notification "+result[i].cgpa);
                eventEmitter.emit('sendFCM',result[i].token,result[i].cgpa);

          }

    }
    console.log("Admin: Push notifications sent")
  })
}

var insertUserResult=function updateResultOneRow(usn,result)
{
  var sql = 'INSERT INTO result (usn, cgpa) VALUES ("'+usn+'","'+result+'")';

  con.query(sql, function (err, result)
  {
    if (err) throw err;
    console.log('Admin: Result record insrted')
  });

}


var insertUserDictionary=function updateDictionaryOneRow(usn,email)
{
  var sql = 'INSERT INTO register (usn, email) VALUES ("'+usn+'","'+email+'")';
  con.query(sql, function (err, result)
  {
    if (err) throw err;
    console.log('Admin: Dictionary record insrted')
  });
}

var sendFCM=function sendingFCM(receiver,result)
{
  console.log(result);
  var messagemm = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
      to: receiver,


      notification: {
          title: 'Result announced!',
          body: 'Your result is '+result+'. This may not be the final result. It can be changed from the college in case of necessity.'
      },

      // data: {  //you can send only notification or only data(or include both)
      //     my_key: 'my value',
      //     my_another_key: 'my another value'
      // }
  }
console.log(messagemm);
  fcm.send(messagemm, function(err, response)
   {
	console.log(messagemm);
      if (err) throw err;
  })
}
var updateUserDictionary=function upUDic(fileName)
{
	var workbook = XLSX.readFile(fileName,{type:"array"});
	var worksheet = workbook.Sheets[workbook.SheetNames[0]];
	for(var i=0;i<262;i++)
	{
		var desired_usn_cell=worksheet['A'+i]
		var desired_cgpa_cell=worksheet['B'+i]
		var desired_usn = (desired_usn_cell ? desired_usn_cell.v :undefined );
		var desired_cgpa = (desired_cgpa_cell ? desired_cgpa_cell.v :undefined );
		if(desired_usn!=undefined)
		{

			var sql = 'INSERT INTO register (usn, email) VALUES ("'+desired_usn+'","'+desired_cgpa+'")';
			con.query(sql, function (err, result)
			{
				if (err) throw err;
			});
		}
	}
	console.log('Admin: Dictionary file loaded')
}



//----------------------------------------------------
//                         Events
var eventEmitter=new events.EventEmitter();
eventEmitter.addListener('getPassword',funPass);
eventEmitter.addListener('saveExceldb',saveResultDB);
eventEmitter.addListener('sendEmail',sendMail);
eventEmitter.addListener('mailPassVarEm',mailPassVar);
eventEmitter.addListener('sendResult',returnResult);
eventEmitter.addListener('notifyResults',notifyResults);
eventEmitter.addListener('sendFCM',sendFCM);
eventEmitter.addListener('HttpTokenUpdate',HttpTokenUpdate);
eventEmitter.addListener('updateUserDictionary',updateUserDictionary);
eventEmitter.addListener('insertUserResult',insertUserResult);
eventEmitter.addListener('insertUserDictionary',insertUserDictionary);
