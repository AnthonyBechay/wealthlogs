import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, StyleSheet, Alert, FlatList, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../navigation/AppNavigator';
import { getTransactions } from '../../services/apiService';

const HomeScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTransactions();
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions for HomeScreen:", err);
      setError(err.message || 'Failed to fetch transactions.');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
      return () => { /* Optional cleanup */ };
    }, [])
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed on HomeScreen:', err);
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  const renderTransactionItem = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionRow}>
        <Text style={styles.transactionDescription}>{item.description || item.type}</Text>
        <Text style={[
            styles.transactionAmount,
            item.type === 'DEPOSIT' || item.type === 'DIVIDEND' ? styles.amountPositive : styles.amountNegative
          ]}>
          {item.type === 'DEPOSIT' || item.type === 'DIVIDEND' ? '+' : '-'}${item.amount.toFixed(2)}
        </Text>
      </View>
      <Text style={styles.transactionDate}>{new Date(item.dateTime).toLocaleDateString()}</Text>
      {item.fromAccount && <Text style={styles.accountInfo}>From: {item.fromAccount.name}</Text>}
      {item.toAccount && <Text style={styles.accountInfo}>To: {item.toAccount.name}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddTransaction')} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {isLoading && transactions.length === 0 ? (
        <ActivityIndicator size="large" color="#007bff" style={{marginTop: 20}}/>
      ) : error ? (
        <View style={styles.centeredMessage}>
            <Text style={styles.errorText}>{error}</Text>
            <Button title="Retry" onPress={fetchTransactions} />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centeredMessage}>
          <Text style={styles.noTransactionsText}>No transactions yet. Add one!</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          onRefresh={fetchTransactions}
          refreshing={isLoading}
        />
      )}
      <View style={styles.footer}>
        <Button title="Logout" onPress={handleLogout} color="#ff6347" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 25 : 15,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
  },
  addButton: {
    backgroundColor: '#007bff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  transactionItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
    flexShrink: 1, // Allow text to shrink if too long
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  amountPositive: {
    color: '#28a745',
  },
  amountNegative: {
    color: '#dc3545',
  },
  transactionDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 3,
  },
  accountInfo: {
    fontSize: 12,
    color: '#6c757d',
  },
  centeredMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTransactionsText: {
    fontSize: 18,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    backgroundColor: '#ffffff',
  }
});

export default HomeScreen;
