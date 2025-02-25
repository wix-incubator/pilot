import React, {useState} from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Switch,
} from 'react-native';
import StarRating from 'react-native-star-rating-widget';
import Slider from '@react-native-community/slider';
import {styles} from './styles';

const RadioButton = ({label, isSelected, onSelect}: { label: string; isSelected: boolean; onSelect: () => void }) => (
    <TouchableOpacity onPress={onSelect} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
        <View
            style={styles.checkbox}
        >
            {isSelected && <View style={styles.checkedInner}/>}
        </View>
        <Text style={{marginLeft: 10}}>{label}</Text>
    </TouchableOpacity>
);

const AssertionsScreen: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [isEnabled, setIsEnabled] = useState<boolean>(false);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [items, setItems] = useState<string[]>([]);
    const [rating, setRating] = useState(0);

    const addItem = (): void => {
        if (username.trim()) {
            setItems(prev => [...prev, username.trim()]);
            setUsername('');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.controls}>
                <View style={styles.switchContainer}>
                    <Text>Toggle Switch:</Text>
                    <Switch
                        onValueChange={setIsEnabled}
                        value={isEnabled}
                    />
                </View>
            </View>

            <View style={styles.controls}>
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={1}
                    minimumTrackTintColor="#blue"
                    maximumTrackTintColor="#000000"
                />
            </View>


            <View style={styles.controls}>
                <RadioButton
                    label="The better option"
                    isSelected={selectedOption === 'option1'}
                    onSelect={() => setSelectedOption('option1')}
                />
                <RadioButton
                    label="The best option"
                    isSelected={selectedOption === 'option2'}
                    onSelect={() => setSelectedOption('option2')}
                />
            </View>

            <View style={styles.controls}>
                <StarRating
                    rating={rating}
                    onChange={setRating}
                    style={styles.starRating}
                    color={'blue'}
                />
            </View>

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter text"
                />
                <TouchableOpacity
                    style={styles.button}
                    onPress={addItem}
                >
                    <Text style={styles.buttonText}>Add Item</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView}>
                {items.map((item, index) => (
                    <View
                        key={index}
                        style={styles.item}
                    >
                        <Text>{item}</Text>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

export default AssertionsScreen;
