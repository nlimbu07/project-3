const { User, Product, Review, Order, Category } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers = {
    Query: {
        user: async (parent, args, context) => {
            if (context.user) {
                const user = await User.findById(context.user._id)
                    .populate('reviews')
                    .populate({
                        path: 'orders.products',
                        populate: 'category'
                    });
    
                user.orders.sort((a,b) => b.purchaseDate - a.purchaseDate);
    
                return user;
            }

            throw new AuthenticationError('Not logged in');
        },

        products: async (parent, { category, name }) => {
            const params = {};

            if (category) {
                params.category = category;
            }

            if (name) {
                params.name = {
                    $regex: name
                };
            }

            return await Product.find(params)
            .populate('category')
            .populate('reviews');
        },

        product: async (parent, { _id }) => {
            return await Product.findById({ _id })
            .populate('category')
            .populate('reviews');
        },

        order: async (parent, { orderId }, context) => {
            if (context.user) {
                const user = await User.findById(context.user._id)
                .populate({
                    path: 'orders.products',
                    populate: 'category'
                });
        
                return user.orders.id(orderId);
            }

            throw new AuthenticationError('Not logged in');
        },

        categories: async () => {
            return await Category.find();
        },
        
        checkout: async (parent, args, context) => {
          const url = new URL(context.headers.referer).origin;
          const order = new Order({ products: args.products });
          const { products } = await order.populate('products').execPopulate();
    
          const line_items = [];
    
          for (let i = 0; i < products.length; i++) {
            // generate product id
            const product = await stripe.products.create({
              name: products[i].name,
              description: products[i].description,
              images: [`${url}/images/${products[i].image}`]
            });
    
            // generate price id using the product id
            const price = await stripe.prices.create({
              product: product.id,
              unit_amount: products[i].price * 100,
              currency: 'usd',
            });
    
            // add price id to the line items array
            line_items.push({
              price: price.id,
              quantity: 1
            });
          }
    
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${url}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${url}/`
          });
          
          return { session: session.id };
        }
    },

    Mutation: {
        login: async (parent, { email, password }) => {
            const user = await User.findOne({ email });

            if (!user) {
                throw new AuthenticationError('Incorrect credentials');
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw) {
                throw new AuthenticationError('Incorrect credentials');
            }

            const token = signToken(user);
            
            return { token, user };
        },

        
        addUser: async (parent, args) => {
            const user = await User.create(args);
            const token = signToken(user);

            return { token, user };
        },

        addReview: async (parent, args) => {
            const review = await Review.create({ rating: args.rating, reviewText: args.reviewText });

            await User.findByIdAndUpdate(
                { _id: args.userId },
                { $push: { reviews: review._id } },
                { new: true, runValidators: true }
            );

            await Product.findByIdAndUpdate(
                { _id: args.productID },
                { $push: { reviews: review._id } },
                { new: true, runValidators: true }
            );

            return review;
        },

        addOrder: async (parent, { products }, context) => {
            if (context.user) {
                const order = new Order({ products });
        
                await User.findByIdAndUpdate(context.user._id, { $push: { orders: order } });
        
                return order;
            }

            throw new AuthenticationError('Not logged in');
        },
    }
};

module.exports = resolvers;