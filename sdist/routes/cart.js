"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../functions/helpers");
const promise_helpers_1 = require("../functions/promise-helpers");
const express = require("express");
const async_database_1 = require("../middleware/async-database");
const router = express.Router();
let viewPrefix = 'cart/';
router.route('/cart')
    .post((req, res) => {
    let product = req.body.product.split(',');
    let inputs = {
        product_id: product[0],
        name: product[1],
        price: product[2],
        size: product[3],
        uuid: req.session.user.uuid,
        quantity: req.body.quantity,
        cart_uuid: '',
        card_number: ''
    };
    async_database_1.db.query('SELECT card_number FROM payment_credit WHERE (user_uuid, active) = ($1, $2)', [inputs.uuid, true])
        .then((result) => {
        inputs.card_number = result.rows[0].card_number;
        return async_database_1.db.query('SELECT cart_uuid FROM cart WHERE user_uuid = $1', [req.session.user.uuid]);
    })
        .then((result) => {
        inputs.cart_uuid = result.rows[0].cart_uuid;
        return async_database_1.db.query('SELECT product_id FROM cart_items WHERE cart_uuid = $1 and product_id = $2', [inputs.cart_uuid, inputs.product_id]);
    })
        .then((result) => {
        if (result.rows.length === 0) {
            return async_database_1.db.query('INSERT INTO cart_items(product_id, cart_uuid, quantity) VALUES ($1, $2, $3)', [inputs.product_id, inputs.cart_uuid, inputs.quantity]);
        }
        else {
            return async_database_1.db.query('UPDATE cart_items SET quantity = quantity+$1 WHERE cart_uuid = $2 AND product_id = $3', [inputs.quantity, inputs.cart_uuid, inputs.product_id]);
        }
    })
        .then((result) => {
        res.redirect('../../products');
    })
        .catch((err) => {
        console.log(err);
        let userError = helpers_1.dbErrTranslator(err.message);
        res.render('shopping/products', { dbError: userError });
    });
})
    .get((req, res) => {
    let uuid = req.session.user.uuid, cartContent = [], totalCost = 0, totalItems = 0, price, quantity;
    let query = 'SELECT p.product_id, name, price, size, description FROM products p INNER JOIN cart_items c ON p.product_id = c.product_id AND (c.cart_uuid = $1)';
    let input = [req.session.user.cart_uuid];
    async_database_1.db.query(query, input)
        .then((result) => {
        cartContent = result.rows;
        for (let i = 0; i < cartContent.length; i++) {
            cartContent[i].email = req.session.user.email;
        }
        console.log('CARTCONTENT', cartContent);
        return async_database_1.db.query('SELECT * FROM cart_items WHERE cart_uuid = $1', [req.session.user.cart_uuid]);
    })
        .then((result) => {
        for (let i = 0; i < cartContent.length; i++) {
            for (let j = 0; j < result.rows.length; j++) {
                if (cartContent[i].product_id === result.rows[j].product_id) {
                    cartContent[i].quantity = result.rows[j].quantity;
                }
            }
            price = parseInt(cartContent[i].price);
            quantity = parseInt(cartContent[i].quantity);
            totalCost = totalCost + (price * quantity);
            totalItems = totalItems + quantity;
        }
        return async_database_1.db.query('SELECT card_number FROM cart WHERE user_uuid = $1', [req.session.user.uuid]);
    })
        .then((result) => {
        let lastFour = promise_helpers_1.lastFourOnly(result.rows[0].card_number);
        let card_number = result.rows[0].card_number;
        res.render(viewPrefix + 'cart', {
            cartContent: cartContent,
            totalCost: totalCost,
            totalItems: totalItems,
            lastFour: lastFour,
            card_number: card_number,
            email: req.session.user.email,
        });
    })
        .catch((err) => {
        console.log('get cart error', err);
        let userError = helpers_1.dbErrTranslator(err.message);
        res.render(viewPrefix + 'cart', { dbError: userError });
    });
});
router.route('/cart/:product_id')
    .get((req, res) => {
    let cart_uuid = req.session.user.cart_uuid;
    async_database_1.db.query('SELECT * FROM cart_items WHERE cart_uuid = $1 AND product_id = $2', [cart_uuid, req.query.product_id])
        .then((result) => {
        res.render(viewPrefix + 'edit-cart-item', {
            name: result.rows[0].name,
            product_id: result.rows[0].product_id,
            quantity: result.rows[0].quantity,
            uuid: cart_uuid,
            email: req.session.user.email
        });
    })
        .catch((err) => {
        console.log(err.stack);
        res.render(viewPrefix + 'cart', { dbError: err.stack });
    });
})
    .put((req, res) => {
    let quantity = parseInt(req.body.quantity);
    let product_id = req.body.product_id;
    let cart_uuid = req.session.user.cart_uuid;
    if (req.body.quantity === 0) {
        async_database_1.db.query('DELETE FROM cart_items WHERE product_id = $1 AND cart_uuid = $2', [req.query.product_id, cart_uuid])
            .then((result) => {
            res.redirect('/acccounts/:email/cart');
        })
            .catch((err) => {
            console.log(err.stack);
            res.render(viewPrefix + 'cart', { dbError: err.stack });
        });
    }
    async_database_1.db.query('UPDATE cart_items SET quantity = $1 WHERE cart_uuid = $2 AND product_id = $3', [quantity, cart_uuid, product_id])
        .then((result) => {
        res.redirect('/accounts/' + req.session.user.email + '/cart');
    })
        .catch((err) => {
        console.log(err.stack);
        res.render(viewPrefix + 'cart', { dbError: err.stack });
    });
})
    .delete((req, res) => {
    let cart_uuid = req.session.user.cart_uuid;
    async_database_1.db.query('DELETE FROM cart_items WHERE product_id = $1 AND cart_uuid = $2', [req.body.product_id, cart_uuid])
        .then((result) => {
        res.redirect('/accounts/' + req.session.user.email + '/cart');
    })
        .catch((err) => {
        console.log(err.stack);
        res.render(viewPrefix + 'cart', { dbError: err.stack });
    });
});
router.route('/payment-select')
    .get((req, res) => {
    let uuid = req.session.user.uuid;
    let paymentContent;
    async_database_1.db.query("SELECT * FROM payment_credit WHERE user_uuid = $1", [uuid])
        .then((result) => {
        paymentContent = result.rows;
        return async_database_1.db.query('SELECT card_number FROM cart WHERE user_uuid = $1', [req.session.user.uuid]);
    })
        .then((result) => {
        let lastFour = promise_helpers_1.lastFourOnly(result.rows[0].card_number);
        res.render(viewPrefix + 'payments-cart-select', {
            paymentContent: paymentContent,
            activeCard: lastFour,
            email: req.session.user.email
        });
    })
        .catch((error) => {
        console.log(error);
        res.redirect('./cart');
    });
})
    .post((req, res) => {
    let card_number = req.body.card_number;
    async_database_1.db.query('UPDATE cart SET card_number = $1 WHERE user_uuid = $2', [card_number, req.session.user.uuid])
        .then((result) => {
        res.redirect('/accounts/' + req.session.user.email + '/cart');
    })
        .catch((error) => {
        console.log(error);
        res.render(viewPrefix + 'payments-cart-select', {
            dbError: error
        });
    });
});
module.exports = router;
//# sourceMappingURL=cart.js.map