import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

function ProductAttributesPage() {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div style={styles.container}>Loading user information...</div>;
  }

  if (!currentUser || userRole !== 'admin') {
    return <div style={styles.container}><h2 style={styles.accessDenied}>Access denied. You need to be an administrator to manage product attributes.</h2></div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Manage Product Attributes</h1>
      <p style={styles.description}>Select which type of attribute you want to manage:</p>
      <div style={styles.linksContainer}>
        <Link to="/settings/categories" style={styles.linkButton}>
          Manage Categories
        </Link>
        <Link to="/settings/size-grades" style={styles.linkButton}>
          Manage Size Grades
        </Link>
        <Link to="/settings/colors" style={styles.linkButton}>
          Manage Colors
        </Link>
        <Link to="/settings/suppliers" style={styles.linkButton}>
          Manage Suppliers
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  title: {
    color: '#333',
    marginBottom: '20px',
    fontSize: '2.2em',
    fontWeight: 'bold',
  },
  description: {
    color: '#555',
    marginBottom: '30px',
    fontSize: '1.1em',
  },
  linksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  linkButton: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '15px 25px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '1.2em',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease',
  },
  accessDenied: {
    color: '#dc3545',
    fontSize: '1.5em',
    marginTop: '50px',
  },
};

export default ProductAttributesPage;
