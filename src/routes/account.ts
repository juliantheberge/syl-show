import * as express from 'express';
import * as helper from '../functions/helpers';
let router: any  = express.Router();

//to sign up page
router.get('/to-create', function(req:any, res:any, next:Function) {
  console.log('/to-create');
  res.render('create-account', {success: false});
});

//sends user information to database,
router.post('/create', function (req:any, res:any, next:Function) {
  console.log('/create');
  var thisPage = 'create-account';
  var nextPage ='create-account';
  var inputs = {
    email: req.body.email,
    phone: req.body.phone,
    password:req.body.password,
    user_uuid:"",
    nonce:""
  };
  helper.passHash(inputs.password, function (err:any, hash:string) {
    if (err) {
      helper.genError(res, thisPage, err); // u
    } else {
      inputs.password = hash;
      req.querySvc.insertNewUser(inputs, function (err:any, result:any) {
        if (err) {
          helper.dbError(res, thisPage, err);
        } else {
          helper.makeHashedString(function(err:object, hash:string) {
            if (err) {
              helper.genError(res, thisPage, "Password encryption error"); // u
            } else {
              inputs.user_uuid = result.rows[0].user_uuid;
              inputs.nonce = hash;
              req.querySvc.insertNewNonce(inputs, function(err:any, result:any) {
                if (err) {
                  helper.dbError(res, thisPage, err);  // u
                } else {
                  res.render(nextPage, {
                    success: true,
                    email: inputs.email,
                    phone: inputs.phone,
                  });
                }
              });
            }
          });
        }
      });
    }
  });
});


router.post('/delete', function (req:any, res:any, next:Function) {
  console.log('/delete');
  var thisPage = 'account-actions';
  var nextPage ='login';

  res.render(nextPage, {
    accountDelete:true,
  });
});

module.exports = router;
