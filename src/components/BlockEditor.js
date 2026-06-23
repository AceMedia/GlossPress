import { useRef, useEffect } from '@wordpress/element';
import IsolatedBlockEditor from '@automattic/isolated-block-editor';
import '@automattic/isolated-block-editor/build-browser/core.css';

const wrapPlainText = (text) => {
    if (!text || text.trim() === '') return '';
    if (text.includes('<!-- wp:')) return text;
    return `<!-- wp:paragraph -->\n<p>${text}</p>\n<!-- /wp:paragraph -->`;
};

const BlockEditor = ({ termId, content, onChange, onFocus, textareaId }) => {
    const onChangeRef = useRef(onChange);
    const onFocusRef = useRef(onFocus);
    const textareaRef = useRef(null);
    const lastTermIdRef = useRef(termId);
    const lastContentPropRef = useRef(content);
    const isInitializingRef = useRef(true);
    
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);
    
    useEffect(() => {
        onFocusRef.current = onFocus;
    }, [onFocus]);
    
    useEffect(() => {
        const termChanged = termId !== lastTermIdRef.current;
        const contentChanged = content !== lastContentPropRef.current;

        if (textareaRef.current && (termChanged || contentChanged)) {
            textareaRef.current.value = content || '';
            isInitializingRef.current = true;
        }

        if (termChanged) {
            lastTermIdRef.current = termId;
        }

        lastContentPropRef.current = content;
    }, [termId, content]);
    
    // Sync textarea to onChange callback - this fires on every keystroke
    const handleSaveContent = (content) => {
        const skipInitialEmission = isInitializingRef.current && content === lastContentPropRef.current;
        isInitializingRef.current = false;

        if (!skipInitialEmission && onChangeRef.current) {
            onChangeRef.current(content, textareaRef.current);
        }
        
        if (textareaRef.current) {
            textareaRef.current.value = content;
        }
    };
    
    const handleLoad = (parseFunc) => {
        const currentContent = textareaRef.current?.value || content || '';
        const wrappedContent = wrapPlainText(currentContent);
        return parseFunc(wrappedContent);
    };
    
    const handleSelection = () => {
        if (onFocusRef.current) {
            onFocusRef.current();
        }
    };
    
    return (
        <div className="glossary-block-editor">
            {/* Hidden textarea to store content - synced by IsolatedBlockEditor */}
            <textarea 
                ref={textareaRef}
                id={textareaId}
                style={{ display: 'none' }}
                defaultValue={content || ''}
            />
            <IsolatedBlockEditor
                settings={{
                    iso: {
                        blocks: {
                            allowBlocks: true,
                            disallowBlocks: ['core/freeform', 'core/classic'],
                        },
                        moreMenu: false,
                        toolbar: {
                            navigation: false,
                            undo: true,
                        },
                        sidebar: {
                            inserter: true,
                            inspector: false,
                        },
                    },
                    editor: {
                        hasFixedToolbar: false,
                    },
                }}
                onSaveContent={handleSaveContent}
                onLoad={handleLoad}
                __experimentalOnSelection={handleSelection}
            >
            </IsolatedBlockEditor>
        </div>
    );
};

export default BlockEditor;
