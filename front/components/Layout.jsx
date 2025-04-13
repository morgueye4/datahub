import React from 'react';
import { Container } from 'react-bootstrap';

const Layout = ({ children }) => {
  return (
    <Container className="py-4">
      {children}
    </Container>
  );
};

export default Layout;
