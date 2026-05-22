import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateUserPassage } from '@/hooks/useUserPassages';
import { describeError } from '@/services/errors';
import { useTheme } from '@/theme/useTheme';

const MAX_BODY_LENGTH = 5000;

export default function NewLibraryPassageScreen() {
  const theme = useTheme();
  const router = useRouter();
  const createMutation = useCreateUserPassage();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const canSave = body.trim().length > 0 && body.length <= MAX_BODY_LENGTH;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    createMutation.mutate(
      {
        title: trimmedTitle.length > 0 ? trimmedTitle : null,
        body: body.trim(),
      },
      {
        onSuccess: (passage) => {
          router.replace(`/library/${passage.id}`);
        },
      },
    );
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: theme.color.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[theme.text.heading, { color: theme.color.text, marginBottom: theme.space.md }]}>
            Add passage
          </Text>

          <Text style={[theme.text.caption, { color: theme.color.textMuted, marginBottom: theme.space.xs }]}>
            Title (optional)
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Untitled"
            placeholderTextColor={theme.color.textDim}
            style={[
              styles.input,
              {
                color: theme.color.text,
                backgroundColor: theme.color.surface,
                borderRadius: theme.radius.md,
              },
              theme.text.body,
            ]}
          />

          <Text
            style={[
              theme.text.caption,
              { color: theme.color.textMuted, marginTop: theme.space.md, marginBottom: theme.space.xs },
            ]}
          >
            Spanish text
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Paste any Spanish paragraph…"
            placeholderTextColor={theme.color.textDim}
            multiline
            textAlignVertical="top"
            style={[
              styles.bodyInput,
              {
                color: theme.color.text,
                backgroundColor: theme.color.surface,
                borderRadius: theme.radius.md,
              },
              theme.text.body,
            ]}
          />
          <Text
            style={[
              theme.text.tiny,
              {
                color:
                  body.length > MAX_BODY_LENGTH ? theme.color.danger : theme.color.textMuted,
                marginTop: theme.space.xs,
                textAlign: 'right',
              },
            ]}
          >
            {body.length} / {MAX_BODY_LENGTH}
          </Text>

          {createMutation.error ? (
            <Text
              style={[
                theme.text.tiny,
                { color: theme.color.danger, marginTop: theme.space.sm },
              ]}
            >
              {describeError(createMutation.error)}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.color.surface,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[theme.text.body, { color: theme.color.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!canSave || createMutation.isPending}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor:
                    !canSave || createMutation.isPending
                      ? theme.color.accentMuted
                      : theme.color.accent,
                  borderRadius: theme.radius.md,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    theme.text.body,
                    { color: '#FFFFFF', fontFamily: theme.fontFamily.sansMedium },
                  ]}
                >
                  Save
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16 },
  input: { paddingHorizontal: 12, paddingVertical: 10 },
  bodyInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 220,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 100,
    alignItems: 'center',
  },
});
