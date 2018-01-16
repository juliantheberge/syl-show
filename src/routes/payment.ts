import * as express from 'express';
import * as bcrypt from 'bcrypt';
import * as url from 'url';
import { Inputs, PGOutput } from '../../typings/typings';
import { db } from '../middleware/async-database';
const router = express.Router();

let viewPefix = 'payment/'

router.get('/new-payment', (req, res) => {
  let email = req.session.user.email;
  res.render('new-payment', {
    email:email
  })
})

router.route('/payment')
  .get((req, res) => {
    db.query("SELECT * FROM payment_credit WHERE user_uuid = $1", [req.session.user.uuid])
      .then((result) => {
        let paymentContent = result.rows
        res.render(viewPefix + 'payments', {
          paymentContent:paymentContent,
          email:req.session.user.email
        })
      })
      .catch((error) => {
        console.log(error)
        res.render(viewPefix + 'payments', {
          dbError:error,
          email:req.session.user.email
        })
      })
  })
  .post((req, res) => {
    let uuid = req.session.user.uuid;
    let email = req.session.user.email;
    let inputs = {
      name:req.body.name,
      cardNumber:req.body.cardNumber,
      expDay:req.body.expDay,
      expMonth:req.body.expMonth,
      cvv:req.body.cvv,
      address:req.body.address,
      city:req.body.city,
      state:req.body.state,
      zip:req.body.zip,
    }
    db.query('SELECT * FROM payment_credit WHERE user_uuid = $1', [uuid])
      .then((result) => {
        if (result.rows.length > 0) {
          return db.query('UPDATE payment_credit SET active = $1 WHERE user_uuid = $2', [false, uuid])
        }
      })
      .then((result) => {
        let query = 'INSERT INTO payment_credit (user_uuid, card_number, name, exp_month, exp_date, cvv, address_1, city, state, zip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)';
        let input = [uuid, inputs.cardNumber, inputs.name, inputs.expMonth, inputs.expDay, inputs.cvv, inputs.address, inputs.city, inputs.state, inputs.zip];

        return db.query(query, input);
      })
      .then((result) => {
        let query = 'INSERT INTO cart (card_number, user_uuid) VALUES ($1, $2)';
        let input = [inputs.cardNumber, req.session.user.uuid];
        return db.query(query, input);
      })
      .then((result) => {
        res.render(viewPefix + 'new-payment', {
          success:true,
          name:inputs.name,
          address:inputs.address,
          city:inputs.city,
          state:inputs.state,
          zip:inputs.zip,
          email:email
        })
      })
      .catch((error) => {
        console.log(error)
        res.render(viewPefix + 'new-payment', {
          dbError:error,
          email:req.session.user.email
        })
      })
  })

router.route('/payment/active-payment')
  .put((req, res) => {
    let card_number = req.body.card_number;
    console.log(card_number)
    db.query('UPDATE payment_credit SET active = $1 WHERE user_uuid = $2', [false, req.session.user.uuid])
      .then((result) => {
        let query = 'UPDATE payment_credit SET active = $1 WHERE (card_number, user_uuid) = ($2, $3)';
        let input = [true, card_number, req.session.user.uuid];
        return db.query(query, input)
      })
      .then((result) => {
        res.redirect('/accounts/' + req.session.user.email + '/payment')
      })
      .catch((error) => {
        console.log(error)
        res.render(viewPefix + 'payments', {
          dbError:error,
          email:req.session.user.email
        })
      })
  })


router.route('/payment/:credit')
  .get((req, res) => {
    // show users particular payment
  })
  .put((req, res) => {
    // update all of the information (no partial change)
  })
  .delete((req, res) => {
    // remove card information entirely
  })

module.exports = router;
