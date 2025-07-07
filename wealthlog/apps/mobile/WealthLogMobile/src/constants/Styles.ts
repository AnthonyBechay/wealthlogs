// src/constants/Styles.ts
import { StyleSheet, Platform } from 'react-native';
import Colors, { commonColors } from './Colors'; // Assuming you'll use a theme hook or pass theme

// Example: Choose a theme or use common colors directly for now
const currentTheme = Colors.light; // Or Colors.dark based on useColorScheme()

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: currentTheme.background,
    padding: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: currentTheme.background,
    padding: 20,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: currentTheme.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: currentTheme.secondary,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: currentTheme.inputBackground,
    borderColor: currentTheme.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: currentTheme.text,
  },
  button: {
    width: '100%',
    backgroundColor: currentTheme.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: commonColors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 10,
  },
  linkButtonText: {
    color: currentTheme.link,
    fontSize: 14,
  },
  errorText: {
    color: currentTheme.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  loader: {
    marginVertical: 20,
  },
  // Header styles for screens that show it
  headerBase: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: Platform.OS === 'android' ? 25 : 40,
    paddingBottom: 15,
    backgroundColor: currentTheme.card, // Typically white or a light card color
    borderBottomWidth: 1,
    borderBottomColor: currentTheme.border,
    elevation: Platform.OS === 'android' ? 2 : 0, // Android shadow
    shadowColor: commonColors.black, // iOS shadow
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  headerTitle: {
    fontSize: 20, // Standard header title size
    fontWeight: '600',
    color: currentTheme.text,
  },
  // Specific list item styles might still live in their components or be more generic here
  listItem: {
    backgroundColor: currentTheme.card,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: currentTheme.border,
  },
  separator: {
    height: 1,
    backgroundColor: currentTheme.border,
    marginVertical: 8, // Example usage
  },
  // Add more global styles as needed: text variants, card styles, etc.
});

// It's often useful to export font sizes and spacing units too
export const typography = {
    fontSizeSmall: 12,
    fontSizeRegular: 14,
    fontSizeMedium: 16,
    fontSizeLarge: 18,
    fontSizeTitle: 24,
    fontWeightLight: '300' as '300',
    fontWeightRegular: '400' as '400',
    fontWeightMedium: '500' as '500',
    fontWeightBold: '700' as '700',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

// Function to get themed colors if you decide to implement dynamic theming later
// export const useTheme = () => {
//   const colorScheme = useColorScheme(); // 'light' or 'dark'
//   return colorScheme === 'dark' ? Colors.dark : Colors.light;
// };
// Then in components: const theme = useTheme(); style={{color: theme.text}}
