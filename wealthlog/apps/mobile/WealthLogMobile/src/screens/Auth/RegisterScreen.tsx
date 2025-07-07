import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { registerUser } from '../../services/apiService';
import { globalStyles, commonColors, spacing, typography } from '../../constants/Styles';
import Colors from '../../constants/Colors';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields (*).');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', "Passwords don't match!");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        Alert.alert('Validation Error', 'Please enter a valid email address.');
        return;
    }
    if (password.length < 6) {
        Alert.alert('Validation Error', 'Password should be at least 6 characters long.');
        return;
    }

    setIsLoading(true);
    try {
      const userData = {
        username: username.trim(),
        email: email.trim(),
        password: password.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      };
      const response = await registerUser(userData);
      Alert.alert(
        'Registration Successful',
        response.message || 'Please check your email to verify your account.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      console.error('Register screen error:', error);
      let errorMessage = 'An unexpected error occurred during registration.';
       if (error && error.error === 'Username or email already in use') {
        errorMessage = 'This username or email is already taken. Please choose another.';
      } else if (error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join WealthLog today!</Text>

            <TextInput style={globalStyles.input} placeholder="Username*" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor={Colors.light.secondary}/>
            <TextInput style={globalStyles.input} placeholder="Email*" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.light.secondary}/>
            <TextInput style={globalStyles.input} placeholder="Password*" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor={Colors.light.secondary}/>
            <TextInput style={globalStyles.input} placeholder="Confirm Password*" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor={Colors.light.secondary}/>
            <TextInput style={globalStyles.input} placeholder="First Name (Optional)" value={firstName} onChangeText={setFirstName} placeholderTextColor={Colors.light.secondary}/>
            <TextInput style={globalStyles.input} placeholder="Last Name (Optional)" value={lastName} onChangeText={setLastName} placeholderTextColor={Colors.light.secondary}/>

            {isLoading ? (
            <ActivityIndicator size="large" color={commonColors.primary} style={globalStyles.loader} />
            ) : (
            <TouchableOpacity style={[globalStyles.button, styles.registerButton]} onPress={handleRegister}>
                <Text style={globalStyles.buttonText}>Register</Text>
            </TouchableOpacity>
            )}
            <TouchableOpacity style={globalStyles.linkButton} onPress={() => !isLoading && navigation.navigate('Login')}>
            <Text style={globalStyles.linkButtonText}>Already have an account? Login</Text>
            </TouchableOpacity>
        </View>
        </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'ios' ? spacing.md : 0,
  },
  container: {
    ...globalStyles.centeredContainer,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...globalStyles.titleText,
    fontSize: typography.fontSizeTitle + 4,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...globalStyles.subtitleText,
    marginBottom: spacing.xl,
  },
  registerButton: { // Specific style for register button color
    backgroundColor: commonColors.success, // Use success color from common colors
  }
  // Input, linkButton, loader styles are taken from globalStyles
});

export default RegisterScreen;
