import React, {useState} from 'react';
import {
    SafeAreaView,
    View,
    Text,
    ScrollView,
    Pressable,
    TouchableOpacity,
    Modal,
} from 'react-native';
import {styles} from './styles';

interface ColorItem {
    word: string;
    textColor: string;
    isCorrect: boolean;
}

const ColorGameScreen: React.FC = () => {
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [selectedColor, setSelectedColor] = useState<string>('');

    const colorItems: ColorItem[] = [
        {word: 'Red', textColor: '#572626', isCorrect: false},
        {word: 'Blue', textColor: '#0000FF', isCorrect: true},
        {word: 'Green', textColor: '#FF0000', isCorrect: false},
        {word: 'Purple', textColor: '#800080', isCorrect: true},
        {word: 'Orange', textColor: '#e56ef1', isCorrect: false},
        {word: 'Yellow', textColor: '#FFD700', isCorrect: true},
        {word: 'Pink', textColor: '#00FF00', isCorrect: false},
        {word: 'Brown', textColor: '#000000', isCorrect: false},
        {word: 'Gray', textColor: '#808080', isCorrect: true},
    ];

    const handleColorPress = (color: ColorItem) => {
        if (color.isCorrect) {
            setSelectedColor(color.word);
            setShowSuccessModal(true);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.colorSection}>
                <Text style={styles.colorTitle}>Color Match Game</Text>
                <Text style={styles.colorInstructions}>
                    Find and click the words that are written in their own color!
                </Text>
                <ScrollView style={styles.colorScrollView}>
                    {colorItems.map((color, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.colorItem}
                            onPress={() => handleColorPress(color)}
                        >
                            <Text style={[styles.colorText, {color: color.textColor}]}>
                                {color.word}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={showSuccessModal}
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Pressable style={styles.closeButton} onPress={() => setShowSuccessModal(false)}>
                                <Text style={styles.closeButtonText}>X</Text>
                            </Pressable>
                        </View>
                        <Text style={styles.modalText}>
                            🎉 Correct! 🎉{'\n'}
                            "{selectedColor}" is in its true color!
                        </Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default ColorGameScreen;
