import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { QUERY_USER } from '../utils/queries';
import Cart from '../components/Cart';

function OrderHistory() {
  const { data } = useQuery(QUERY_USER);
  let user;

  if (data) {
    user = data.user;
  }


  return (
    <>
      <div className='container'>

        {user ? (
          <div className='card mx-auto product col-lg-6 col-md-8 col-12'>
          <Link to='/'>Back to Products</Link>
            <h2>
              Order History for {user.username}              
            </h2>
            {user.orders.map((order) => (
              <div key={order._id}>
                <h3>
                  {new Date(parseInt(order.purchaseDate)).toLocaleDateString()}
                </h3>
                <div>
                  {order.products.map(
                    ({ _id, image, name, price }, index) => (
                      <div key={index}>
                        <Link to={`/products/${_id}`}>
                          <img alt={name} src={`/images/${image}`} />
                          <p>{name}</p>
                        </Link>
                        <div>
                          <span>${price}</span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <Cart />
      </div>
    </>
  );
}

export default OrderHistory;
