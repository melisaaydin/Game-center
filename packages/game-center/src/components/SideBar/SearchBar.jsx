import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, Avatar, Link as MuiLink } from '@mui/material';
import { IoSearch } from 'react-icons/io5';
import { Link } from 'react-router-dom';
import { searchGames, searchUsers } from '../../utils/api';
import './SideBar.css';

function SearchBar({ searchRef }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ games: [], users: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const handleSearch = async () => {
        if (searchQuery.trim() === '') {
            setSearchResults({ games: [], users: [] });
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const [games, users] = await Promise.all([
                searchGames(searchQuery),
                searchUsers(searchQuery),
            ]);
            setSearchResults({ games, users });
        } catch (err) {
            setError(err.message);
            setSearchResults({ games: [], users: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };
    const handleResultClick = () => {
        setSearchQuery('');
        setSearchResults({ games: [], users: [] });
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setSearchResults({ games: [], users: [] });
            setLoading(false);
            setError(null);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            handleSearch();
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchResults({ games: [], users: [] });
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchRef]);
    return (
        <Box className="headerSearch" ref={searchRef}>
            <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={inputRef}
            />
            {searchQuery && (
                <Button onClick={() => setSearchQuery('')} disableRipple>
                    Clear
                </Button>
            )}
            <Button disableRipple onClick={handleSearch}>
                <IoSearch />
            </Button>

            {searchQuery.trim() && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        width: '100%',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        backgroundColor: 'var(--paper-color)',
                        boxShadow: '0 4px 10px var(--shadow-color)',
                        borderRadius: '8px',
                        zIndex: 1200,
                        padding: '10px',
                        marginTop: '2px',
                    }}
                >
                    {error && (
                        <Box sx={{ padding: '8px', color: 'var(--primary-color)' }}>{error}</Box>
                    )}
                    <Box>
                        <span style={{ color: 'var(--text-color)', fontWeight: '500' }}>Games</span>
                        {loading ? (
                            <Box sx={{ padding: '8px', textAlign: 'center' }}>
                                <CircularProgress size={20} />
                            </Box>
                        ) : searchResults.games.length === 0 ? (
                            <Box sx={{ padding: '8px', color: 'var(--text-color)' }}>No games found</Box>
                        ) : (
                            searchResults.games.map((game) => (
                                <MuiLink
                                    key={game.id}
                                    to={`/games/${encodeURIComponent(game.id)}`}
                                    underline="none"
                                    component={Link}
                                    onClick={handleResultClick}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '8px',
                                            '&:hover': {
                                                backgroundColor: 'var(--background-color-secondary)',
                                            },
                                        }}
                                    >
                                        <Avatar
                                            src={game.image_url ? `http://localhost:8081${game.image_url}` : '/default-game.png'}
                                            alt={game.title}
                                            sx={{ width: 40, height: 40, marginRight: 2 }}
                                        />
                                        <span style={{ color: 'var(--text-color)' }}>{game.title}</span>
                                    </Box>
                                </MuiLink>
                            ))
                        )}
                    </Box>
                    <Box sx={{ marginTop: '10px' }}>
                        <span style={{ color: 'var(--text-color)', fontWeight: '500' }}>Users</span>
                        {loading ? (
                            <Box sx={{ padding: '8px', textAlign: 'center' }}>
                                <CircularProgress size={20} />
                            </Box>
                        ) : searchResults.users.length === 0 ? (
                            <Box sx={{ padding: '8px', color: 'var(--text-color)' }}>No users found</Box>
                        ) : (
                            searchResults.users.map((user) => (
                                <MuiLink
                                    key={user.id}
                                    to={`/users/user/${user.id}`}
                                    underline="none"
                                    component={Link}
                                    onClick={handleResultClick}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '8px',
                                            '&:hover': {
                                                backgroundColor: 'var(--background-color-secondary)',
                                            },
                                        }}
                                    >
                                        <Avatar
                                            src={user.avatar_url ? `http://localhost:8081/uploads/${user.avatar_url}` : '/default-avatar.png'}
                                            alt={user.name}
                                            sx={{ width: 40, height: 40, marginRight: 2 }}
                                        />
                                        <span style={{ color: 'var(--text-color)' }}>{user.name}</span>
                                    </Box>
                                </MuiLink>
                            ))
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
}

export default SearchBar;