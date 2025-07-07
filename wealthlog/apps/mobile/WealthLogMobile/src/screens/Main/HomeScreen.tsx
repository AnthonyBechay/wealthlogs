import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, FlatList, ActivityIndicator, TouchableOpacity, Platform, RefreshControl, Button } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../navigation/AppNavigator';
import { getTransactions } from '../../services/apiService';
import { globalStyles, commonColors, spacing, typography } from '../../constants/Styles';
import Colors from '../../constants/Colors';


interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'DIVIDEND';
  amount: number;
  description: string | null;
  dateTime: string;
  fromAccount?: { name: string };
  toAccount?: { name: string };
}

const HomeScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setError(null);
    try {
      const data = await getTransactions();
      setTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions for HomeScreen:", err);
      const errorMessage = err.message || err.error || 'Failed to fetch transactions.';
      setError(errorMessage);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchTransactions().finally(() => setIsLoading(false));
      return () => {};
    }, [fetchTransactions])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchTransactions();
    setIsRefreshing(false);
  }, [fetchTransactions]);


  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed on HomeScreen:', err);
      Alert.alert('Error', 'Logout failed. Please try again.');
    }
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionRow}>
        <Text style={styles.transactionDescription} numberOfLines={1} ellipsizeMode="tail">
            {item.description || item.type}
        </Text>
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

  if (isLoading && transactions.length === 0 && !isRefreshing) {
    return <View style={globalStyles.centeredContainer}><ActivityIndicator size="large" color={commonColors.primary} /></View>;
  }

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddTransaction')} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {error && transactions.length === 0 ? (
        <View style={globalStyles.centeredContainer}>
            <Text style={globalStyles.errorText}>{error}</Text>
            <Button title="Retry" onPress={() => { setIsLoading(true); fetchTransactions().finally(() => setIsLoading(false)); }} color={commonColors.primary} />
        </View>
      ) : transactions.length === 0 && !isLoading ? (
        <View style={globalStyles.centeredContainer}>
          <Text style={styles.noTransactionsText}>No transactions yet. Tap 'Add New' to start!</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={transactions.length === 0 ? styles.listEmpty : {}}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[commonColors.primary]}
              tintColor={commonColors.primary}
            />
          }
        />
      )}
      {error && transactions.length > 0 && (
          <Text style={styles.inlineErrorText}>Could not refresh: {error}</Text>
      )}
      <View style={styles.footer}>
        <Button title="Logout" onPress={handleLogout} color={commonColors.danger} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // container: globalStyles.container, // Base container style from global
  header: { // Extend global header style or define locally
    ...globalStyles.headerBase, // Use base header style
    // any local overrides for HomeScreen header
  },
  headerTitle: { // Extend global header title or define locally
    ...globalStyles.headerTitle,
    // any local overrides
  },
  addButton: {
    backgroundColor: commonColors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
  },
  addButtonText: {
    color: commonColors.white,
    fontSize: typography.fontSizeMedium,
    fontWeight: typography.fontWeightMedium,
  },
  list: {
    flex: 1,
  },
  listEmpty: { // Style for when FlatList is empty, to center the "No transactions" message
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionItem: {
    ...globalStyles.listItem, // Use global list item base
     paddingVertical: spacing.md, // Adjust padding
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  transactionDescription: {
    fontSize: typography.fontSizeMedium,
    fontWeight: typography.fontWeightMedium,
    color: Colors.light.text, // Use themed text color
    flexShrink: 1,
  },
  transactionAmount: {
    fontSize: typography.fontSizeMedium,
    fontWeight: typography.fontWeightBold,
  },
  amountPositive: { color: commonColors.success },
  amountNegative: { color: commonColors.danger },
  transactionDate: { fontSize: typography.fontSizeSmall, color: Colors.light.secondary, marginBottom: spacing.xs / 2 },
  accountInfo: { fontSize: typography.fontSizeSmall, color: Colors.light.secondary },
  noTransactionsText: { fontSize: typography.fontSizeLarge, color: Colors.light.secondary, textAlign: 'center' },
  inlineErrorText: {
      fontSize: typography.fontSizeRegular,
      color: commonColors.danger,
      textAlign: 'center',
      padding: spacing.sm,
      backgroundColor: Colors.light.errorBackground || '#ffe0e0' // Add errorBackground to Colors.ts if needed
    },
  footer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  }
  // centeredMessage and errorText from globalStyles are used directly
});

export default HomeScreen;
