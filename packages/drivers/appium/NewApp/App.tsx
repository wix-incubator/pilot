import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const App: React.FC = () => {
    const [counter1, setCounter1] = useState<number>(0);
    const [counter2, setCounter2] = useState<number>(0);
    const [counter3, setCounter3] = useState<number>(0);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Simple Counter App</Text>

            <TouchableOpacity onPress={() => setCounter1(counter1 + 1)}>
                <Text style={styles.counterText}>First Counter: {counter1}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCounter2(counter2 + 1)}>
                <Text style={styles.counterText}>Second Counter: {counter2}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setCounter3(counter3 + 1)}>
                <Text style={styles.counterText}>Third Counter: {counter3}</Text>
            </TouchableOpacity>

            <Text style={styles.instruction}>Tap any counter text to increment it!</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 40,
        color: '#333',
    },
    counterText: {
        fontSize: 20,
        color: '#007AFF',
        backgroundColor: '#fff',
        padding: 15,
        marginVertical: 10,
        borderRadius: 8,
        minWidth: 200,
        textAlign: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    instruction: {
        fontSize: 16,
        color: '#666',
        marginTop: 30,
        textAlign: 'center',
    },
});

export default App;
