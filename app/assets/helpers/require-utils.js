module.exports = {
    requireAll: function requireAll( requireContext ){
        return requireContext.keys().map( requireContext );
    }
};
