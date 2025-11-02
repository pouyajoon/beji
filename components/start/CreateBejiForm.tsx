import { EmojiPicker } from "./EmojiPicker";
import { BejiNameInput } from "./BejiNameInput";
import { StartAction } from "./StartAction";
import { SelectedPreview } from "./SelectedPreview";

type CreateBejiFormProps = {
    emojiGrid: number[][];
    selectedEmoji: number[] | null;
    bejiName: string;
    isCreating: boolean;
    messages: Record<string, string>;
    onSelectEmoji: (cps: number[] | null) => void;
    onNameChange: (value: string) => void;
    onCreate: () => void;
};

export function CreateBejiForm({
    emojiGrid,
    selectedEmoji,
    bejiName,
    isCreating,
    messages,
    onSelectEmoji,
    onNameChange,
    onCreate,
}: CreateBejiFormProps) {
    return (
        <>
            <EmojiPicker
                label={messages.chooseEmojiLabel ?? "Choose Your Emoji"}
                emojiGrid={emojiGrid}
                selectedEmoji={selectedEmoji}
                onSelect={onSelectEmoji}
            />

            <BejiNameInput
                label={messages.nameLabel ?? "Give Your Beji a Name"}
                placeholder={messages.namePlaceholder ?? "e.g. Beji the Brave"}
                value={bejiName}
                onChange={onNameChange}
                onEnter={onCreate}
            />

            <StartAction
                label={isCreating ? (messages.creating ?? "Creating...") : (messages.startButton ?? "Start Adventure! 🚀")}
                href="#"
                disabled={!selectedEmoji || !bejiName.trim() || isCreating}
                onActivate={onCreate}
            />

            <SelectedPreview emoji={selectedEmoji} name={bejiName} />
        </>
    );
}

