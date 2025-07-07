import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { getFinancialAccounts, createTransaction } from '../../services/apiService';
import { globalStyles, commonColors, spacing, typography } from '../../constants/Styles';
import Colors from '../../constants/Colors';

interface Account {
  id: string;
  name: string;
  currency: string;
}
type TransactionType = 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'DIVIDEND';

const AddTransactionScreen = ({ navigation }) => {
  const [type, setType] = useState<TransactionType>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [dateTime, setDateTime] = useState(new Date());
  const [description, setDescription] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setIsAccountsLoading(true);
    try {
      const fetchedAccounts = await getFinancialAccounts();
      setAccounts(fetchedAccounts || []);
      if (fetchedAccounts && fetchedAccounts.length > 0) {
        if (type === 'DEPOSIT' || type === 'DIVIDEND') setToAccountId(fetchedAccounts[0].id);
        else if (type === 'WITHDRAW') setFromAccountId(fetchedAccounts[0].id);
      } else {
        Alert.alert("No Accounts Found", "You need at least one financial account to create transactions. Please add an account via the web interface for now.");
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch financial accounts.');
      console.error("Fetch accounts error:", error);
    } finally {
      setIsAccountsLoading(false);
    }
  }, [type]); // type in dependency to re-evaluate pre-selection if type changes

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const showDatePicker = () => setDatePickerVisibility(true);
  const hideDatePicker = () => setDatePickerVisibility(false);
  const handleConfirmDate = (date: Date) => {
    setDateTime(date);
    hideDatePicker();
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setFromAccountId(null);
    setToAccountId(null);
    if (accounts.length > 0) {
        if (newType === 'DEPOSIT' || newType === 'DIVIDEND') setToAccountId(accounts[0].id);
        else if (newType === 'WITHDRAW') setFromAccountId(accounts[0].id);
    }
  };

  const handleSubmit = async () => {
    if (!type || !amount.trim()) {
      Alert.alert('Validation Error', 'Type and Amount are required.');
      return;
    }
    const numericAmount = parseFloat(amount.trim());
    if (isNaN(numericAmount) || numericAmount <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid positive amount.');
        return;
    }

    let finalFromAccountId: string | null = null;
    let finalToAccountId: string | null = null;

    if (type === 'DEPOSIT' || type === 'DIVIDEND') {
        if (!toAccountId) { Alert.alert('Validation Error', 'Destination account is required for this transaction type.'); return; }
        finalToAccountId = toAccountId;
    } else if (type === 'WITHDRAW') {
        if (!fromAccountId) { Alert.alert('Validation Error', 'Source account is required for this transaction type.'); return; }
        finalFromAccountId = fromAccountId;
    } else if (type === 'TRANSFER') {
        if (!fromAccountId || !toAccountId) { Alert.alert('Validation Error', 'Both source and destination accounts are required for transfers.'); return; }
        if (fromAccountId === toAccountId) { Alert.alert('Validation Error', 'Source and destination accounts cannot be the same for a transfer.'); return; }
        finalFromAccountId = fromAccountId;
        finalToAccountId = toAccountId;
    }

    setIsLoading(true);
    try {
      const transactionData = {
        type,
        amount: numericAmount,
        fromAccountId: finalFromAccountId,
        toAccountId: finalToAccountId,
        dateTime: dateTime.toISOString(),
        description: description.trim() || null,
      };
      await createTransaction(transactionData);
      Alert.alert('Success', 'Transaction created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Transaction Error', error.message || error.error || 'Failed to create transaction.');
      console.error("Create transaction error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAccountsLoading) {
    return <View style={globalStyles.centeredContainer}><ActivityIndicator size="large" color={commonColors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingContainer}
    >
        <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
        >
        <View style={styles.container}>
            <Text style={styles.title}>Add New Transaction</Text>

            <Text style={styles.label}>Transaction Type*</Text>
            <View style={styles.pickerContainerStyle}>
                <Picker selectedValue={type} onValueChange={handleTypeChange} style={styles.pickerStyle} itemStyle={styles.pickerItemStyle}>
                <Picker.Item label="Deposit" value="DEPOSIT" />
                <Picker.Item label="Withdrawal" value="WITHDRAW" />
                <Picker.Item label="Transfer" value="TRANSFER" />
                <Picker.Item label="Dividend" value="DIVIDEND" />
                </Picker>
            </View>

            <Text style={styles.label}>Amount*</Text>
            <TextInput style={globalStyles.input} placeholder="e.g., 100.50" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={Colors.light.secondary}/>

            {(type === 'WITHDRAW' || type === 'TRANSFER') && (
            <>
                <Text style={styles.label}>From Account*</Text>
                <View style={styles.pickerContainerStyle}>
                    <Picker selectedValue={fromAccountId} onValueChange={(itemValue) => setFromAccountId(itemValue)} style={styles.pickerStyle} itemStyle={styles.pickerItemStyle} enabled={accounts.length > 0}>
                    <Picker.Item label="Select Source Account..." value={null} />
                    {accounts.map(acc => <Picker.Item key={acc.id} label={`${acc.name} (${acc.currency})`} value={acc.id} />)}
                    </Picker>
                </View>
            </>
            )}

            {(type === 'DEPOSIT' || type === 'TRANSFER' || type === 'DIVIDEND') && (
            <>
                <Text style={styles.label}>To Account*</Text>
                <View style={styles.pickerContainerStyle}>
                    <Picker selectedValue={toAccountId} onValueChange={(itemValue) => setToAccountId(itemValue)} style={styles.pickerStyle} itemStyle={styles.pickerItemStyle} enabled={accounts.length > 0}>
                    <Picker.Item label="Select Destination Account..." value={null} />
                    {accounts.map(acc => <Picker.Item key={acc.id} label={`${acc.name} (${acc.currency})`} value={acc.id} />)}
                    </Picker>
                </View>
            </>
            )}

            <Text style={styles.label}>Date & Time*</Text>
            <TouchableOpacity onPress={showDatePicker} style={styles.dateButtonStyle}>
                <Text style={styles.dateButtonTextStyle}>{dateTime.toLocaleString()}</Text>
            </TouchableOpacity>
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="datetime"
                date={dateTime}
                onConfirm={handleConfirmDate}
                onCancel={hideDatePicker}
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput style={globalStyles.input} placeholder="e.g., Monthly Salary, Groceries" value={description} onChangeText={setDescription} placeholderTextColor={Colors.light.secondary}/>

            {isLoading ? (
            <ActivityIndicator size="large" color={commonColors.primary} style={{marginTop: spacing.lg}} />
            ) : (
            <TouchableOpacity style={[globalStyles.button, styles.submitButtonStyle]} onPress={handleSubmit}>
                <Text style={globalStyles.buttonText}>Create Transaction</Text>
            </TouchableOpacity>
            )}
        </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  container: { ...globalStyles.container, paddingHorizontal: spacing.lg }, // Use global and override
  title: { ...globalStyles.titleText, marginBottom: spacing.lg + spacing.xs }, // More margin for title
  label: {
    fontSize: typography.fontSizeMedium,
    color: Colors.light.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    fontWeight: typography.fontWeightMedium,
   },
  pickerContainerStyle: { // Renamed to avoid conflict with globalStyles.pickerContainer if it existed
    ...globalStyles.input, // Base input style for border, bg, etc.
    paddingHorizontal: 0, // Picker might need no horizontal padding in container
    justifyContent: 'center',
  },
  pickerStyle: { // Style for the Picker component itself
    width: '100%',
    height: '100%', // Fill the container
    color: Colors.light.text, // Text color for picker items
  },
  pickerItemStyle: { // Style for Picker.Item (mostly for iOS)
     fontSize: typography.fontSizeMedium,
     color: Colors.light.text,
  },
  dateButtonStyle: { // Renamed
    ...globalStyles.input, // Base on input style
    justifyContent: 'center', // Center text vertically
  },
  dateButtonTextStyle: { // Renamed
    fontSize: typography.fontSizeMedium,
    color: Colors.light.text,
  },
  submitButtonStyle: { // Renamed
    backgroundColor: commonColors.success,
    marginTop: spacing.lg,
  }
  // Other styles like input, button text are inherited from globalStyles
});

export default AddTransactionScreen;
