import { useRef, useEffect, useState, useMemo } from '@wordpress/element';
import { BlockEditorProvider, BlockList, BlockTools, WritingFlow, ObserveTyping, Inserter } from '@wordpress/block-editor';
import { parse, rawHandler, serialize, getBlockTypes, getBlockType } from '@wordpress/blocks';
import { registerCoreBlocks } from '@wordpress/block-library';
import { Button, Popover } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { MediaUpload, uploadMedia } from '@wordpress/media-utils';
import { addFilter, hasFilter } from '@wordpress/hooks';

if (!hasFilter('editor.MediaUpload', 'acemedia-glossary/media-upload')) {
    addFilter('editor.MediaUpload', 'acemedia-glossary/media-upload', () => MediaUpload);
}

// Use the installed WordPress editor rather than a second, version-bound copy.
const prepareBlocks = (content) => {
    const value = content || '';
    return value.includes('<!-- wp:') ? parse(value) : rawHandler({ HTML: value });
};

const BlockEditor = ({ termId, content, onChange, onFocus, textareaId }) => {
    const textareaRef = useRef(null);
    const lastValue = useRef(content || '');
    const lastTerm = useRef(termId);
    const callbacks = useRef({ onChange, onFocus });
    callbacks.current = { onChange, onFocus };
    const [blocks, setBlocks] = useState(() => {
        if (!getBlockType('core/paragraph')) registerCoreBlocks();
        return prepareBlocks(content);
    });
    const [history, setHistory] = useState({ past: [], future: [] });
    const settings = useMemo(() => ({
        allowedBlockTypes: getBlockTypes().map(({ name }) => name).filter(name => !['core/freeform', 'core/classic'].includes(name)),
        hasFixedToolbar: true,
        canLockBlocks: false,
        mediaUpload: uploadMedia,
    }), []);

    useEffect(() => {
        const value = content || '';
        if (lastTerm.current !== termId || value !== lastValue.current) {
            lastTerm.current = termId;
            lastValue.current = value;
            setBlocks(prepareBlocks(value));
            setHistory({ past: [], future: [] });
            if (textareaRef.current) textareaRef.current.value = value;
        }
    }, [termId, content]);

    const publish = next => {
        const value = serialize(next);
        setBlocks(next);
        if (value === lastValue.current) return;
        lastValue.current = value;
        if (textareaRef.current) textareaRef.current.value = value;
        callbacks.current.onChange?.(value, textareaRef.current);
    };
    const update = next => {
        if (serialize(next) !== lastValue.current) {
            setHistory(previous => ({ past: [...previous.past.slice(-49), blocks], future: [] }));
        }
        publish(next);
    };
    const undo = () => {
        if (!history.past.length) return;
        setHistory({ past: history.past.slice(0, -1), future: [blocks, ...history.future] });
        publish(history.past[history.past.length - 1]);
    };
    const redo = () => {
        if (!history.future.length) return;
        setHistory({ past: [...history.past, blocks], future: history.future.slice(1) });
        publish(history.future[0]);
    };
    return (
        <div className="glossary-block-editor" onFocus={() => callbacks.current.onFocus?.()}>
            <textarea ref={textareaRef} id={textareaId} style={{ display: 'none' }} defaultValue={content || ''} />
            <BlockEditorProvider value={blocks} onInput={update} onChange={update} settings={settings}>
                <div className="glossary-editor-actions">
                    <Inserter />
                    <Button onClick={undo} disabled={!history.past.length}>{__('Undo', 'acemedia-glossary')}</Button>
                    <Button onClick={redo} disabled={!history.future.length}>{__('Redo', 'acemedia-glossary')}</Button>
                </div>
                <BlockTools>
                    <WritingFlow><ObserveTyping><BlockList /></ObserveTyping></WritingFlow>
                </BlockTools>
                <Popover.Slot />
            </BlockEditorProvider>
        </div>
    );
};
export default BlockEditor;
