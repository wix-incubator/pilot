import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        backgroundColor: '#f0f0f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    inputContainer: {
        padding: 16,
        flexDirection: 'row',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        padding: 8,
        marginRight: 8,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 8,
        borderRadius: 4,
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
    },
    controls: {
        padding: 16,
        marginBottom: 20,
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scrollView: {
        flex: 1,
    },
    item: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    // Emoji Game specific styles
    emojiContainer: {
        padding: 16,
        backgroundColor: '#f8f8f8',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 'auto',
    },
    emojiTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    targetContainer: {
        flexDirection: 'column', // Changed to column to contain rows
        alignItems: 'center', // Center the rows horizontally
    },
    emojiRow: {
        flexDirection: 'row', // Each row is a horizontal layout
        justifyContent: 'center', // Center emojis within the row
        marginVertical: 10, // Add some vertical spacing between rows
    },
    draggableContainer: {
        flexDirection: 'column', // Changed to column to contain rows
        alignItems: 'center', // Center the rows horizontally
    },
    emojiTarget: {
        width: 60,
        height: 60,
        margin: 10,
        borderWidth: 2,
        borderColor: '#ccc',
        borderStyle: 'dashed',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transparentEmoji: {
        fontSize: 30,
        opacity: 0.3,
    },
    draggableEmoji: {
        width: 60,
        height: 60,
        margin: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 30,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    emojiText: {
        fontSize: 30,
    },
    scoreText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        textAlign: 'center',
    },
    // Color Game specific styles
    colorSection: {
        padding: 16,
        backgroundColor: '#f8f8f8',
        marginVertical: 10,
        minHeight: 250,
    },
    colorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 16,
    },
    colorScrollView: {
        maxHeight: 400,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
    },
    colorItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#ffffff',
    },
    colorText: {
        fontSize: 18,
        fontWeight: '500',
        textAlign: 'center',
    },
    colorInstructions: {
        textAlign: 'center',
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 8,
        alignItems: 'center',
        width: '80%',
        position: 'relative',
    },
    modalText: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 24,
    },
    modalHeader: { // Style for the header containing the close button
        flexDirection: 'row',
        justifyContent: 'flex-end', // Align close button to the right
        width: '100%',
        marginBottom: 10,  // Add some margin below the header
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 0,
    },
    closeButtonText: {
        color: 'black',
        fontSize: 18,
        fontWeight: 'bold',
        position: 'absolute',
        bottom: 0,
    },
    //checkbox styles
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'gray',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    checkedInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'blue',
    },
    label: {
        marginLeft: 10,
    },
    //star rating styles
    starRating: {
        marginHorizontal: 'auto',
    },
    //slider styles
    slider: {
        width: '100%',
        height: 40,
    },
});
