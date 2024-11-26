import { useEffect, useRef, useCallback, useMemo, memo  } from '@wordpress/element';


const SearchComponent = memo(({ searchQuery, setSearchQuery }) => {
    const inputRef = useRef(null);

    const handleFocus = useCallback(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        // Only focus the input if it's actively being typed in, not on initial load
        if (searchQuery.length > 0) {
            handleFocus();
        }
    }, [searchQuery, handleFocus]);

    return (
        <div className='search-holder'>
            <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                style={{ width: '100%', marginBottom: '0px' }}
                autoComplete="off"
                onFocus={handleFocus} // Ensures input regains focus if clicked
            />
            <span className="dashicons dashicons-search" style={{ marginLeft: '5px' }}></span>
        </div>
    );
});

export default React.memo(SearchComponent);
