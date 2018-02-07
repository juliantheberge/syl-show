import * as express from 'express';
import { dbErrTranslator, compare } from '../../functions/helpers';
import { db } from '../../middleware/database';
const router = express.Router();

let viewPrefix = 'alarms/'

router.route('/alarms')
  .post((req, res) => {
    let query = 'INSERT INTO alarms(user_uuid, title, awake) VALUES ($1, $2, $3) RETURNING *';
    let input = [req.session.user.uuid, req.body.title, req.body.awake];

    db.query(query, input)
      .then((result) => {
        res.redirect('alarms');
      })
      .catch((err) => {
        console.log(err);
        let userError = dbErrTranslator(err.message)
        res.render(viewPrefix + 'new-alarm', { dbError: userError });
      });
  })
  .get((req, res) => {

    db.query("SELECT * FROM alarms WHERE user_uuid = $1", [req.session.user.uuid])
      .then((result) => {
        let alarmContent = result.rows;
        let sortedAlarms = alarmContent.sort(compare)

        res.render(viewPrefix + 'alarms', {
          alarmContent:sortedAlarms,
          email:req.session.user.email
        })
      })
      .catch((err) => {
        console.log(err)
        res.render('error', {
          errName: err.message,
          errMessage: null
        });
      });
  })

router.get('/new-alarm', (req, res, next) => {
  res.render(viewPrefix + 'new-alarm', {
    email:req.session.user.email
  })
})

router.route('/alarms/:title')
  .get((req, res) => {
    let title = req.query.title;

    db.query("SELECT * FROM alarms WHERE title = $1 AND user_uuid = $2", [title, req.session.user.uuid])
      .then((result) => {
        res.render(viewPrefix + 'edit-alarm', {
          title:result.rows[0].title,
          awake:result.rows[0].awake,
          active:result.rows[0].active,
          email:req.session.user.email
        })
      })
      .catch((err) => {
        console.log(err.stack);
        res.render('/alarms/:title', { dbError: err.stack });
      });
    })
    .put((req, res) => {
      let inputs = {
        prevTitle:req.body.prevTitle, // should be an id
        title:req.body.title,
        awake:req.body.awake,
        active:req.body.active
      }

      let query = 'UPDATE alarms SET (title, awake, active) = ($1, $2, $3) WHERE title = $4 RETURNING *';
      let input = [inputs.title, inputs.awake, inputs.active, inputs.prevTitle];
      db.query(query, input)
        .then((result) => {
          console.log(result)
          res.redirect('/accounts/' + req.session.user.email + '/alarms');
        })
        .catch((err) => {
          console.log(err.stack)
          res.render(viewPrefix + 'alarms', { dbError: err.stack });
        });
    })
    .delete((req, res) => {

      let title = req.body.title
      db.query('DELETE FROM alarms WHERE title = $1', [title])
        .then((result) => {
          res.redirect('/accounts/' + req.session.user.email + '/alarms');
        })
        .catch((err) => {
          console.log(err.stack)
          res.render(viewPrefix + 'alarms', { dbError: err.stack });
        });
    })


module.exports = router;
